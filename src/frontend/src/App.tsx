import { Navigate, useRoutes } from 'react-router-dom';
import { ProtectedRoute } from '@components/auth/ProtectedRoute';
import { AdminRoute } from '@components/auth/AdminRoute';
import { AppLayout } from '@components/layout/AppLayout';
import { LoginPage } from '@pages/auth/LoginPage';
import { DashboardPage } from '@pages/dashboard/DashboardPage';
import { FlightListPage } from '@pages/flights/FlightListPage';
import { FlightDetailPage } from '@pages/flights/FlightDetailPage';
import { BookingListPage } from '@pages/bookings/BookingListPage';
import { CreateBookingPage } from '@pages/bookings/CreateBookingPage';
import { BookingDetailPage } from '@pages/bookings/BookingDetailPage';
import { UserListPage } from '@pages/users/UserListPage';
import { UserFormPage } from '@pages/users/UserFormPage';
import { UserDetailPage } from '@pages/users/UserDetailPage';
import { AirportListPage } from '@pages/airports/AirportListPage';
import { AirportFormPage } from '@pages/airports/AirportFormPage';
import { AircraftListPage } from '@pages/aircrafts/AircraftListPage';
import { AircraftFormPage } from '@pages/aircrafts/AircraftFormPage';
import { FlightFormPage } from '@pages/flights/FlightFormPage';
import { SeatManagementPage } from '@pages/seats/SeatManagementPage';
import { PassengerListPage } from '@pages/passengers/PassengerListPage';
import { PassengerDetailPage } from '@pages/passengers/PassengerDetailPage';
import { NotFoundPage } from '@pages/NotFoundPage';

export default function App() {
  const element = useRoutes([
    { path: '/login', element: <LoginPage /> },
    {
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      children: [
        { path: '/', element: <Navigate to="/dashboard" replace /> },
        { path: '/dashboard', element: <DashboardPage /> },
        { path: '/flights', element: <FlightListPage /> },
        { path: '/flights/:id', element: <FlightDetailPage /> },
        { path: '/bookings', element: <BookingListPage /> },
        { path: '/bookings/create', element: <CreateBookingPage /> },
        { path: '/bookings/:id', element: <BookingDetailPage /> },
        {
          element: <AdminRoute />,
          children: [
            { path: '/users', element: <UserListPage /> },
            { path: '/users/create', element: <UserFormPage /> },
            { path: '/users/:id', element: <UserDetailPage /> },
            { path: '/users/:id/edit', element: <UserFormPage /> },
            { path: '/airports', element: <AirportListPage /> },
            { path: '/airports/create', element: <AirportFormPage /> },
            { path: '/aircrafts', element: <AircraftListPage /> },
            { path: '/aircrafts/create', element: <AircraftFormPage /> },
            { path: '/flights/create', element: <FlightFormPage /> },
            { path: '/flights/:id/seats', element: <SeatManagementPage /> },
            { path: '/passengers', element: <PassengerListPage /> },
            { path: '/passengers/:id', element: <PassengerDetailPage /> }
          ]
        }
      ]
    },
    { path: '*', element: <NotFoundPage /> }
  ]);

  return element;
}
