import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Menu, X, User, LogOut, Calendar, Tag, Heart, Headset, ChevronDown, Coins, LayoutDashboard,
  Sun, Moon
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useBooking } from "../../context/BookingContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useTheme } from "../../context/ThemeContext";
import { ADMIN_ROLES } from "../../pages/admin/adminConfig";
import logoImg from "../../assets/logo.png";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const { isLoggedIn, user, logout, openLoginModal } = useAuth();
  const { walletBalance = 0 } = useBooking();
  const { currentCurrency, displayPrice, openModal: openCurrencyModal } = useCurrency();
  const { toggleTheme, isDark } = useTheme();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Flights", path: "/flights" },
    { name: "Hotels", path: "/hotels" },
    { name: "Cars", path: "/cars" },
    { name: "Deals", path: "/deals" },
    { name: "My Bookings", path: "/bookings" },
  ];

  /* Active link style */
  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors relative py-1
     after:content-[''] after:absolute after:bottom-[-2px] after:left-0
     after:h-[2px] after:bg-[#008fe5] after:transition-all after:duration-300
     ${isActive
      ? "text-[#008fe5] dark:text-[#38bdf8] font-semibold after:w-full"
      : "text-slate-700 dark:text-slate-300 hover:text-[#008fe5] dark:hover:text-[#38bdf8] after:w-0 hover:after:w-full"
    }`;

  const userName = user?.name || "TravelConnect Member";
  const userInitial = userName.charAt(0).toUpperCase();
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  return (
    <header className="w-full z-50 relative">
      {/* ── Top Utility Header Bar (Matching Trip.com style screenshot) ─────── */}
      <div className="w-full bg-slate-900 text-white text-xs font-medium py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left Promo banner text */}
          <div className="hidden sm:flex items-center gap-2 text-slate-300 text-[11px] sm:text-xs">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">PROMO</span>
            <span>Up to 25% OFF Philippines &amp; International Packages</span>
            <Link to="/deals" className="underline text-[#008fe5] hover:text-blue-300 font-semibold">View Deals</Link>
          </div>

          {/* Right Utilities (Currency, TravelConnect Money, Support, Coins, Profile Avatar) */}
          <div className="flex items-center gap-3 sm:gap-5 ml-auto">
            {/* Country / Currency Indicator */}
            <div 
              onClick={openCurrencyModal}
              className="flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white transition"
            >
              <span className="text-sm">🇵🇭</span>
              <span className="font-bold text-xs">| {currentCurrency.code}</span>
            </div>

            {/* TravelConnect Money / Wallet Balance Indicator */}
            <div
              onClick={() => navigate("/bookings")}
              className="flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-700/80 border border-slate-700/90 px-2.5 py-1 rounded-full text-slate-200 transition shadow-inner group"
              title="TravelConnect Money (Refunds & Wallet Credits)"
            >
              <Coins size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] text-slate-300 font-medium hidden md:inline">TravelConnect Money:</span>
              <span className="font-black text-xs text-emerald-400">{displayPrice(walletBalance)}</span>
            </div>

            {/* Customer Support Link */}
            <button
              onClick={() => setSupportModalOpen(true)}
              className="flex items-center gap-1.5 text-slate-200 hover:text-[#008fe5] transition font-medium text-xs"
            >
              <Headset size={14} className="text-[#008fe5]" />
              <span className="hidden sm:inline">Customer support</span>
            </button>

            {/* Light / Dark Mode Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light or dark theme"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition text-xs cursor-pointer group"
            >
              {isDark ? (
                <>
                  <Sun size={13} className="text-amber-300 group-hover:rotate-45 transition-transform" />
                  <span className="text-[11px] font-medium hidden sm:inline text-slate-300">Light</span>
                </>
              ) : (
                <>
                  <Moon size={13} className="text-sky-300 group-hover:-rotate-12 transition-transform" />
                  <span className="text-[11px] font-medium hidden sm:inline text-slate-300">Dark</span>
                </>
              )}
            </button>

            {/* User Profile Avatar Button */}
            <div className="relative" ref={dropdownRef}>
              {isLoggedIn ? (
                <>
                  {isAdmin && (
                    <button
                      onClick={() => navigate("/admin")}
                      className="flex items-center gap-1.5 bg-[#008fe5]/10 text-[#008fe5] hover:bg-[#008fe5] hover:text-white px-3 py-1.5 rounded-full text-[11px] font-bold transition-all mr-3 border border-[#008fe5]/30"
                    >
                      <LayoutDashboard size={12} />
                      Admin
                    </button>
                  )}
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-1.5 focus:outline-none group"
                    aria-label="User profile menu"
                  >
                    <div className="relative w-7 h-7 rounded-full bg-gradient-to-tr from-[#008fe5] to-blue-400 text-white font-bold flex items-center justify-center text-xs shadow-md border-2 border-slate-700 group-hover:border-[#008fe5] transition">
                      {userInitial}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-slate-900 flex items-center justify-center text-[7px] text-white font-extrabold">
                        T
                      </span>
                    </div>
                    <ChevronDown size={13} className={`text-slate-300 group-hover:text-white transition-transform duration-200 ${profileDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                </>
              ) : (
                <button
                  onClick={openLoginModal}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-[#008fe5] transition"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                    <User size={13} />
                  </div>
                  <span>Sign In</span>
                </button>
              )}

              {/* ── Profile Dropdown Card (Exact Match to User Screenshot) ── */}
              {profileDropdownOpen && isLoggedIn && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Dropdown Header */}
                  <div className="p-4 bg-gradient-to-br from-blue-50/80 to-sky-50/50 border-b border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#008fe5] to-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                          {userInitial}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm leading-tight truncate max-w-[150px]">
                            {userName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TravelConnect Money Wallet Card */}
                    <div className="bg-white/90 border border-blue-100 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                          <Coins size={15} />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">TravelConnect Money</span>
                          <span className="text-xs font-black text-emerald-600">{displayPrice(walletBalance)}</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                        Refund Wallet
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Menu List */}
                  <div className="p-2 space-y-0.5 text-xs font-semibold">
                    <button
                      onClick={() => { navigate("/bookings"); setProfileDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-100/80 text-slate-700 hover:text-[#008fe5] transition text-left"
                    >
                      <Calendar size={16} className="text-slate-400 group-hover:text-[#008fe5]" />
                      <span>My bookings</span>
                    </button>

                    <button
                      onClick={() => { navigate("/bookings"); setProfileDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-100/80 text-slate-700 hover:text-[#008fe5] transition text-left"
                    >
                      <User size={16} className="text-slate-400" />
                      <span>Manage my account</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      onClick={() => { navigate("/deals"); setProfileDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-100/80 text-slate-700 hover:text-[#008fe5] transition text-left"
                    >
                      <Tag size={16} className="text-slate-400" />
                      <span>Promo codes</span>
                    </button>

                    <button
                      onClick={() => { navigate("/saved"); setProfileDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-100/80 text-slate-700 hover:text-[#008fe5] transition text-left"
                    >
                      <Heart size={16} className="text-slate-400" />
                      <span>Saved</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {isAdmin && (
                      <button
                        onClick={() => { navigate("/admin"); setProfileDropdownOpen(false); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-blue-50 text-[#008fe5] transition text-left font-bold"
                      >
                        <LayoutDashboard size={16} className="text-[#008fe5]" />
                        <span>Admin Panel</span>
                      </button>
                    )}

                    <button
                      onClick={() => { logout(); setProfileDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition text-left font-bold"
                    >
                      <LogOut size={16} className="text-red-500" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Navbar ──────────────────────────────────────────────────────── */}
      <nav
        className={`w-full transition-all duration-300 border-b ${isScrolled
          ? "sticky top-0 bg-white/95 dark:bg-[#0a0e17]/95 backdrop-blur-md shadow-md py-3 border-slate-200/80 dark:border-white/[0.08]"
          : "bg-white dark:bg-[#0a0e17] py-3.5 border-slate-100 dark:border-white/[0.08]"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={logoImg}
              alt="TravelConnect Logo"
              className="h-10 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              style={{ mixBlendMode: isDark ? "normal" : "multiply" }}
            />
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
                Travel<span className="text-[#008fe5]">Connect</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] font-extrabold text-slate-400 dark:text-slate-500 mt-0.5">
                Explore the Philippines &amp; World
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.path === "/"}
                className={linkClass}
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          {/* Right Action CTA & Theme Switcher */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick theme icon toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-amber-300 flex items-center justify-center transition-all cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {isLoggedIn ? (
              <button
                onClick={() => navigate("/bookings")}
                className="flex items-center gap-2 bg-blue-50 dark:bg-[#008fe5]/15 text-[#008fe5] dark:text-[#38bdf8] hover:bg-[#008fe5] hover:text-white font-bold px-4 py-2 rounded-full text-xs transition-all duration-300 border border-blue-100 dark:border-[#008fe5]/30"
              >
                <Calendar size={14} />
                My Bookings
              </button>
            ) : (
              <button
                onClick={openLoginModal}
                className="flex items-center gap-2 bg-[#008fe5] hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-full shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all duration-300 text-xs"
              >
                <User size={14} />
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-700 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg"
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 dark:text-slate-200 hover:text-[#008fe5] focus:outline-none rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-[#0a0e17] border-t border-slate-100 dark:border-white/[0.08] px-4 pt-2 pb-6 space-y-1 shadow-xl">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.path === "/"}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive
                    ? "bg-blue-50 dark:bg-[#008fe5]/15 text-[#008fe5] dark:text-[#38bdf8] font-bold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-[#008fe5] dark:hover:text-[#38bdf8]"
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.08] flex flex-col gap-2">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => { navigate("/bookings"); setMobileMenuOpen(false); }}
                    className="w-full text-center bg-blue-50 text-[#008fe5] font-bold py-2.5 rounded-xl text-xs"
                  >
                    My Bookings
                  </button>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="w-full text-center border border-red-200 text-red-500 font-bold py-2.5 rounded-xl text-xs"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { openLoginModal(); setMobileMenuOpen(false); }}
                  className="w-full text-center bg-[#008fe5] hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md text-xs"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Customer Support Modal ──────────────────────────────────────────────── */}
      {supportModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSupportModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#008fe5] flex items-center justify-center mb-4">
              <Headset size={24} />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-1">TravelConnect Support</h3>
            <p className="text-xs text-slate-500 mb-6">Our 24/7 Philippines &amp; International support hotline is ready to help you with booking inquiries, cancellations, or special requests.</p>

            <div className="space-y-3 mb-6">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Hotline (Philippines)</p>
                  <p className="text-sm font-extrabold text-slate-800">+63 (02) 8888-8747</p>
                </div>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">24/7 Toll-Free</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Customer Support Email</p>
                  <p className="text-sm font-extrabold text-slate-800">support@travelconnect.ph</p>
                </div>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">Fast Response</span>
              </div>
            </div>

            <button
              onClick={() => setSupportModalOpen(false)}
              className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-bold py-3 rounded-xl text-xs transition"
            >
              Close Support Dialog
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
