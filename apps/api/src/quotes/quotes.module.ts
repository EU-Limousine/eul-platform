import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { RouteService } from './route.service';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, RouteService],
})
export class QuotesModule {}
