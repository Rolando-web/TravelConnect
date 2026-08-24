import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { BookingProvider } from "./context/BookingContext";
import Layout from "./components/shared/Layout";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Deals from "./pages/Deals";
import Bookings from "./pages/Bookings";
import { BookingCheckoutModal, BookingDetailsModal } from "./components/modals";
import { testApi } from "./services/api";

export default function App() {
  // Test connection to backend server and log message in console
  useEffect(() => {
    testApi()
      .then(data => console.log("Backend Connection Successful:", data.message))
      .catch(error => console.error("Backend Connection Error:", error));
  }, []);

  return (
    <AuthProvider>
      <BookingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Home / landing page */}
              <Route index element={<Home />} />

              {/* Explore destinations & packages */}
              <Route path="explore" element={<Explore />} />

              {/* Exclusive deals & discounts */}
              <Route path="deals" element={<Deals />} />

              {/* My Bookings — login-gated */}
              <Route path="bookings" element={<Bookings />} />
            </Route>
          </Routes>

          {/* Global Checkout & Receipt Modals */}
          <BookingCheckoutModal />
          <BookingDetailsModal />
        </BrowserRouter>
      </BookingProvider>
    </AuthProvider>
  );
}