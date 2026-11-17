import type { PublicCategoryDto } from '@eul/api-client';
import { AboutClassic, AboutNoir, StatsBand } from './about';
import { CtaClassic, CtaNoir, Gallery } from './closing';
import { FleetGrid } from './fleet';
import { HeroClassic, HeroNoir } from './heroes';
import { HowItWorks } from './how-it-works';
import { ServicesDarkTiles, ServicesPhotoCards } from './services';
import { Testimonials } from './social-proof';
import { WhyChoose } from './why-choose';

interface Props {
  categories: PublicCategoryDto[];
  locale: string;
}

/**
 * Homepage Option 1 ("classic": navy + champagne).
 * Reorder, remove or swap sections freely — every section is its own component.
 */
export function HomeClassic({ categories, locale }: Props) {
  return (
    <>
      <HeroClassic />
      <ServicesPhotoCards />
      <AboutClassic />
      <HowItWorks variant="classic" />
      <FleetGrid categories={categories} locale={locale} variant="classic" />
      <WhyChoose variant="classic" />
      <Testimonials variant="classic" />
      <Gallery />
      <CtaClassic />
    </>
  );
}

/**
 * Homepage Option 2 ("noir": black + gold).
 * Sections can be mixed with Option 1's — e.g. use <ServicesPhotoCards /> here.
 */
export function HomeNoir({ categories, locale }: Props) {
  return (
    <>
      <HeroNoir />
      <StatsBand />
      <AboutNoir />
      <ServicesDarkTiles />
      <HowItWorks variant="noir" />
      <FleetGrid categories={categories} locale={locale} variant="noir" />
      <WhyChoose variant="noir" />
      <Testimonials variant="noir" />
      <CtaNoir />
    </>
  );
}
