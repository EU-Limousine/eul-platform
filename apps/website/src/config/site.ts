/**
 * Website-wide settings. Change the homepage option here (or with NEXT_PUBLIC_HOME_VARIANT).
 *   'classic' = Homepage Option 1 (navy + champagne)
 *   'noir'    = Homepage Option 2 (black + gold)
 * The theme follows the variant on every page (header, footer, booking, legal).
 */
export type HomeVariant = 'classic' | 'noir';

const fromEnv = process.env.NEXT_PUBLIC_HOME_VARIANT;
export const HOME_VARIANT: HomeVariant = fromEnv === 'noir' || fromEnv === 'classic' ? fromEnv : 'classic';

/**
 * Company facts shown in header and footer. TODO(content): fill in before launch.
 * Leave a value empty ('') to hide it — never show an invented phone, email or address.
 */
export const COMPANY = {
  name: 'EU Limousine',
  phone: '', // e.g. '+45 12 34 56 78'
  email: '', // e.g. 'bookings@eulimousine.com'
  address: '', // e.g. 'Street 1, 1000 København, Denmark'
  mapsUrl: '', // Google Maps link for "Get directions"
  social: {
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    x: '',
  },
};

/** Temporary logo cut from the homepage design. Replace with the final SVG logo (D-11). */
export const LOGO = { src: '/images/placeholders/logo-temp.png', width: 236, height: 66 };
