import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { LoginPage } from '@/features/auth/login-page';
import { ensureSession } from '@/features/auth/session';
import { BookingDetailPage } from '@/features/bookings/booking-detail-page';
import { BookingsPage } from '@/features/bookings/bookings-page';
import { validateBookingsSearch } from '@/features/bookings/bookings-search';
import { OverviewPage } from '@/features/overview/overview-page';
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

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    createRoute({ getParentRoute: () => appRoute, path: '/', component: OverviewPage }),
    bookingsRoute,
    bookingDetailRoute,
    page('/dispatch', 'nav.dispatch'),
    page('/drivers', 'nav.drivers'),
    page('/vehicles', 'nav.vehicles'),
    page('/pricing', 'nav.pricing'),
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
