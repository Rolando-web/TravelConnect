import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { SignInModal } from "../modals";

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Header component for top deals and nav links */}
      <Header />

      {/* Global sign-in modal */}
      <SignInModal />

      {/* Main content wrapper */}
      <main className="flex-grow w-full relative">
        <Outlet />
      </main>

      {/* Footer component */}
      <Footer />
    </div>
  );
}
