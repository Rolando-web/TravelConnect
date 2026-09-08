import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { BookingProvider } from "./context/BookingContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AvailableProvider } from "./context/AvailableContext";
import Layout from "./components/shared/Layout";
import Home from "./pages/Home";
import Flights from "./pages/Flights";
import FlightDetails from "./pages/FlightDetails";
import Hotels from "./pages/Hotels";
import HotelDetails from "./pages/HotelDetails";
import Cars from "./pages/Cars";
import CarDetails from "./pages/CarDetails";
import Deals from "./pages/Deals";
import DealDetails from "./pages/DealDetails";
import Bookings from "./pages/Bookings";
import Saved from "./pages/Saved";
import { BookingCheckoutModal, BookingDetailsModal, CurrencyModal } from "./components/modals";
import { testApi } from "./services/api";
import AdminLayout from "./components/admin/AdminLayout";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import DashboardPage from "./pages/admin/DashboardPage";
import CustomersPage from "./pages/admin/CustomersPage";
import SuppliersPage from "./pages/admin/SuppliersPage";
import PackagesPage from "./pages/admin/PackagesPage";
import DestinationsPage from "./pages/admin/DestinationsPage";
import BookingsPage from "./pages/admin/BookingsPage";
import PaymentsPage from "./pages/admin/PaymentsPage";
import LeadsPage from "./pages/admin/LeadsPage";
import PromotionsPage from "./pages/admin/PromotionsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import ProfilePage from "./pages/admin/ProfilePage";
import SupportPage from "./pages/admin/SupportPage";
import AdminManagementPage from "./pages/admin/AdminManagementPage";

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
              <Routes>
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
                  <Route path="packages" element={<Deals />} />
                  <Route path="packages/:id" element={<DealDetails />} />
                  <Route path="destinations" element={<Navigate to="/hotels" replace />} />
                  <Route path="promotions" element={<Deals />} />
                </Route>
              </Routes>
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
