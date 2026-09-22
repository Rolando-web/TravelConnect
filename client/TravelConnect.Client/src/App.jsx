import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { AuthProvider } from "./context/AuthContext";
import { BookingProvider } from "./context/BookingContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AvailableProvider } from "./context/AvailableContext";
import Layout from "./components/shared/Layout";
import Home from "./pages/Home";
import { BookingCheckoutModal, BookingDetailsModal, CurrencyModal } from "./components/modals";
import { testApi } from "./services/api";
import AdminLayout from "./components/admin/AdminLayout";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import { CustomerSupportExperience } from "./components/support/SupportChatWidget";

const Flights = lazy(() => import("./pages/Flights"));
const FlightDetails = lazy(() => import("./pages/FlightDetails"));
const Hotels = lazy(() => import("./pages/Hotels"));
const HotelDetails = lazy(() => import("./pages/HotelDetails"));
const Cars = lazy(() => import("./pages/Cars"));
const CarDetails = lazy(() => import("./pages/CarDetails"));
const Deals = lazy(() => import("./pages/Deals"));
const DealDetails = lazy(() => import("./pages/DealDetails"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Saved = lazy(() => import("./pages/Saved"));
const Agencies = lazy(() => import("./pages/Agencies"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const CustomersPage = lazy(() => import("./pages/admin/CustomersPage"));
const SuppliersPage = lazy(() => import("./pages/admin/SuppliersPage"));
const PackagesPage = lazy(() => import("./pages/admin/PackagesPage"));
const DestinationsPage = lazy(() => import("./pages/admin/DestinationsPage"));
const BookingsPage = lazy(() => import("./pages/admin/BookingsPage"));
const PaymentsPage = lazy(() => import("./pages/admin/PaymentsPage"));
const LeadsPage = lazy(() => import("./pages/admin/LeadsPage"));
const PromotionsPage = lazy(() => import("./pages/admin/PromotionsPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const ProfilePage = lazy(() => import("./pages/admin/ProfilePage"));
const SupportPage = lazy(() => import("./pages/admin/SupportPage"));
const SubscriptionsPage = lazy(() => import("./pages/admin/SubscriptionsPage"));
const AdminManagementPage = lazy(() => import("./pages/admin/AdminManagementPage"));
const SupportHubPage = lazy(() => import("./pages/admin/SupportHubPage"));
const PaymentResultPage = lazy(() => import("./pages/PaymentResultPage"));

function SuspenseFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    testApi()
      .then((data) => console.log("Backend Connection Successful:", data.message))
      .catch((error) => console.error("Backend Connection Error:", error));
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
          <BookingProvider>
            <CurrencyProvider>
              <AvailableProvider>
              <BrowserRouter>
              <Suspense fallback={<SuspenseFallback />}>
              <Routes>
                <Route path="/payment-result" element={<PaymentResultPage />} />
                <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<DashboardPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route path="packages" element={<PackagesPage />} />
                  <Route path="destinations" element={<DestinationsPage />} />
                  <Route path="bookings" element={<BookingsPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="promotions" element={<PromotionsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="support-hub" element={<SupportHubPage />} />
                  <Route path="subscriptions" element={<SubscriptionsPage />} />
                  <Route path=":page" element={<AdminManagementPage />} />
                </Route>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="flights" element={<Flights />} />
                  <Route path="flights/:id" element={<FlightDetails />} />
                  <Route path="hotels" element={<Hotels />} />
                  <Route path="hotels/:id" element={<HotelDetails />} />
                  <Route path="cars" element={<Cars />} />
                  <Route path="cars/:id" element={<CarDetails />} />
                  <Route path="deals" element={<Deals />} />
                  <Route path="deals/:id" element={<DealDetails />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="saved" element={<Saved />} />
                  <Route path="support" element={<CustomerSupportExperience />} />
                  <Route path="agencies" element={<Agencies />} />
                  <Route path="packages" element={<Deals />} />
                  <Route path="packages/:id" element={<DealDetails />} />
                  <Route path="destinations" element={<Navigate to="/hotels" replace />} />
                  <Route path="promotions" element={<Deals />} />
                </Route>
              </Routes>
              </Suspense>
              <BookingCheckoutModal />
              <BookingDetailsModal />
              <CurrencyModal />
            </BrowserRouter>
            </AvailableProvider>
          </CurrencyProvider>
        </BookingProvider>
      </FavoritesProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}
