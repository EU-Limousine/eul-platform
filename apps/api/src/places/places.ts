import {
  Controller,
  Get,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Public } from '../auth/decorators';
import type { Env } from '../config/env';
import { DEV_PLACES, searchDevPlaces } from './dev-places';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_URL = 'https://places.googleapis.com/v1/places/';
const LANGUAGES = ['en', 'da', 'de', 'fr', 'es', 'it', 'rm'] as const;

// Results are biased (not limited) towards Copenhagen. TODO(decision): service area limits.
const BIAS = { circle: { center: { latitude: 55.6761, longitude: 12.5683 }, radius: 50_000 } };

// ───────── DTOs ─────────

export class PlaceSearchQueryDto {
  @ApiProperty({ minLength: 2 }) @IsString() @MinLength(2) @MaxLength(120) q!: string;

  @ApiPropertyOptional({ description: 'Session token: one per address field, reused for its details call (cheaper billing)' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{8,64}$/)
  session?: string;

  @ApiPropertyOptional({ enum: LANGUAGES }) @IsOptional() @IsIn(LANGUAGES) lang?: string;
}

export class PlaceDetailsQueryDto {
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Za-z0-9_-]{8,64}$/) session?: string;
  @ApiPropertyOptional({ enum: LANGUAGES }) @IsOptional() @IsIn(LANGUAGES) lang?: string;
}

export class PlaceSuggestionDto {
  @ApiProperty() placeId!: string;
  @ApiProperty() mainText!: string;
  @ApiProperty() secondaryText!: string;
}

export class PlaceDetailsDto {
  @ApiProperty() placeId!: string;
  @ApiProperty({ description: 'Full address to show and store' }) address!: string;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
}

// ───────── Service ─────────

interface GoogleSuggestion {
  placePrediction?: {
    placeId: string;
    text?: { text: string };
    structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
  };
}

/**
 * Address search for the booking form, through our API so the website never holds a Maps key
 * and requests are rate-limited. Uses Google Places API (New) with the server key.
 */
@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  private get key(): string {
    return this.config.get('GOOGLE_MAPS_SERVER_KEY', { infer: true });
  }

  async autocomplete(q: PlaceSearchQueryDto): Promise<PlaceSuggestionDto[]> {
    if (!this.key) return searchDevPlaces(q.q).map(({ placeId, mainText, secondaryText }) => ({ placeId, mainText, secondaryText }));

    const body = await this.google<{ suggestions?: GoogleSuggestion[] }>(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: q.q, sessionToken: q.session, languageCode: q.lang ?? 'en', locationBias: BIAS }),
    });
    return (body.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<GoogleSuggestion['placePrediction']> => !!p)
      .slice(0, 5)
      .map((p) => ({
        placeId: p.placeId,
        mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
      }));
  }

  async details(placeId: string, q: PlaceDetailsQueryDto): Promise<PlaceDetailsDto> {
    if (!this.key) {
      const place = DEV_PLACES.find((p) => p.placeId === placeId);
      if (!place) throw new NotFoundException({ code: 'PLACE_NOT_FOUND', message: 'Address not found.' });
      return { placeId, address: `${place.mainText}, ${place.secondaryText}`, lat: place.lat, lng: place.lng };
    }

    const params = new URLSearchParams({ languageCode: q.lang ?? 'en' });
    if (q.session) params.set('sessionToken', q.session);
    const body = await this.google<{ formattedAddress?: string; displayName?: { text: string }; location?: { latitude: number; longitude: number } }>(
      `${DETAILS_URL}${encodeURIComponent(placeId)}?${params}`,
      { method: 'GET', headers: { 'X-Goog-FieldMask': 'formattedAddress,displayName,location' } },
    );
    if (!body.location) throw new NotFoundException({ code: 'PLACE_NOT_FOUND', message: 'Address not found.' });

    // "Copenhagen Airport, Lufthavnsboulevarden 6, …" reads better than the street address alone.
    const name = body.displayName?.text;
    const formatted = body.formattedAddress ?? name ?? '';
    const address = name && !formatted.startsWith(name) ? `${name}, ${formatted}` : formatted;
    return { placeId, address, lat: body.location.latitude, lng: body.location.longitude };
  }

  private async google<T>(url: string, init: RequestInit): Promise<T> {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), 'X-Goog-Api-Key': this.key },
        signal: AbortSignal.timeout(6_000),
      });
      if (res.status === 404) throw new NotFoundException({ code: 'PLACE_NOT_FOUND', message: 'Address not found.' });
      if (!res.ok) throw new Error(`Places API HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.warn(`Places lookup failed: ${String(error)}`);
      throw new ServiceUnavailableException({ code: 'PLACES_UNAVAILABLE', message: 'Address search is not available right now.' });
    }
  }
}

// ───────── Controller ─────────

@ApiTags('public')
@Public()
@Controller('public/places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get('autocomplete')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOkResponse({ type: [PlaceSuggestionDto] })
  autocomplete(@Query() query: PlaceSearchQueryDto): Promise<PlaceSuggestionDto[]> {
    return this.places.autocomplete(query);
  }

  @Get(':placeId')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ type: PlaceDetailsDto })
  details(@Param('placeId') placeId: string, @Query() query: PlaceDetailsQueryDto): Promise<PlaceDetailsDto> {
    if (!/^[A-Za-z0-9_-]{3,300}$/.test(placeId)) {
      throw new NotFoundException({ code: 'PLACE_NOT_FOUND', message: 'Address not found.' });
    }
    return this.places.details(placeId, query);
  }
}

@Module({ controllers: [PlacesController], providers: [PlacesService] })
export class PlacesModule {}
