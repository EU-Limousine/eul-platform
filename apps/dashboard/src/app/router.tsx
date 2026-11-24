import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { LoginPage } from '@/features/auth/login-page';
import { ensureSession } from '@/features/auth/session';
import { BookingDetailPage } from '@/features/bookings/booking-detail-page';
import { BookingsPage } from '@/features/bookings/bookings-page';
import { validateBookingsSearch } from '@/features/bookings/bookings-search';
import { DriversPage } from '@/features/drivers/drivers-page';
import { EnquiriesPage } from '@/features/enquiries/enquiries-page';
import { validateEnquiriesSearch } from '@/features/enquiries/enquiries-search';
import { OverviewPage } from '@/features/overview/overview-page';
import { PricingPage } from '@/features/pricing/pricing-page';
import { SparesPage } from '@/features/spares/spares-page';
import { VehiclesPage } from '@/features/vehicles/vehicles-page';
import { validateListSearch } from '@/shared/lib/list-search';
import { NotBuilt } from '@/shared/ui/not-built';
import { AppLayout } from './layouts/app-layout';

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    if (await ensureSession()) throw redirect({ to: '/' });
  },
  component: LoginPage,
});

// Every screen below needs a session (restored from the refresh cookie on page load).
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: async () => {
    if (!(await ensureSession())) throw redirect({ to: '/login' });
  },
  component: AppLayout,
});

const page = <TPath extends string>(path: TPath, titleKey: string) =>
  createRoute({ getParentRoute: () => appRoute, path, component: () => <NotBuilt titleKey={titleKey} /> });

const bookingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/bookings',
  validateSearch: validateBookingsSearch,
  component: function BookingsRoute() {
    return <BookingsPage search={bookingsRoute.useSearch()} />;
  },
});

const bookingDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/bookings/$bookingId',
  component: function BookingDetailRoute() {
    const { bookingId } = bookingDetailRoute.useParams();
    return <BookingDetailPage key={bookingId} bookingId={bookingId} />;
  },
});

const driversRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/drivers',
  validateSearch: validateListSearch,
  component: function DriversRoute() {
    return <DriversPage search={driversRoute.useSearch()} />;
  },
});

const vehiclesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/vehicles',
  validateSearch: validateListSearch,
  component: function VehiclesRoute() {
    return <VehiclesPage search={vehiclesRoute.useSearch()} />;
  },
});

const enquiriesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/enquiries',
  validateSearch: validateEnquiriesSearch,
  component: function EnquiriesRoute() {
    return <EnquiriesPage search={enquiriesRoute.useSearch()} />;
  },
});

const sparesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/spares',
  validateSearch: (raw: Record<string, unknown>): { date?: string } => ({
    date: typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : undefined,
  }),
  component: function SparesRoute() {
    return <SparesPage date={sparesRoute.useSearch().date} />;
  },
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    createRoute({ getParentRoute: () => appRoute, path: '/', component: OverviewPage }),
    bookingsRoute,
    bookingDetailRoute,
    enquiriesRoute,
    driversRoute,
    vehiclesRoute,
    sparesRoute,
    createRoute({ getParentRoute: () => appRoute, path: '/pricing', component: PricingPage }),
    page('/dispatch', 'nav.dispatch'),
    page('/users', 'nav.users'),
    page('/audit', 'nav.audit'),
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
