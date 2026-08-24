import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Search, Menu, X, ArrowRight, User, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logoImg from "../../assets/logo.png";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoggedIn, user, logout, openLoginModal } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Explore", path: "/explore" },
    { name: "Deals", path: "/deals" },
    { name: "My Bookings", path: "/bookings" },
  ];

  /* Active link style */
  const linkClass = ({ isActive }) =>
    `text-sm font-semibold transition-colors relative
     after:content-[''] after:absolute after:bottom-[-4px] after:left-0
     after:h-[2px] after:bg-[#008fe5] after:transition-all after:duration-300
     ${isActive
      ? "text-[#008fe5] after:w-full"
      : "text-gray-700 hover:text-[#008fe5] after:w-0 hover:after:w-full"
    }`;

  return (
    <header className="w-full z-50">
      {/* Promo Bar */}
      <div className="w-full bg-[#008fe5] text-white text-xs sm:text-sm font-medium py-2.5 px-4 flex items-center justify-center gap-2 text-center transition-all duration-300">
        <span>✦ EXCLUSIVE SUMMER DEALS — UP TO 30% OFF SELECTED PACKAGES ✦</span>
        <Link
          to="/deals"
          className="inline-flex items-center gap-1 underline hover:text-blue-100 font-semibold cursor-pointer"
        >
          View Deals <ArrowRight size={14} />
        </Link>
      </div>

      {/* Main Navbar */}
      <nav
        className={`w-full transition-all duration-300 border-b border-gray-100 ${isScrolled
            ? "sticky top-0 bg-white/95 backdrop-blur-md shadow-md py-3"
            : "bg-white py-4"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo Section — transparent bg, no dark box */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={logoImg}
              alt="TravelConnect Logo"
              className="h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              style={{ mixBlendMode: "multiply" }}
            />
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none tracking-tight">
                Travel<span className="text-[#008fe5]">Connect</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-gray-500 mt-0.5">
                Wander More
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
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

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">

            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">
                  Hi, {user?.name?.split(" ")[0] || "Traveller"}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:text-red-500 hover:border-red-300 font-semibold px-4 py-2 rounded-full text-sm transition-all duration-300"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={openLoginModal}
                className="flex items-center gap-2 bg-[#008fe5] hover:bg-blue-600 text-white font-bold px-5 py-2.5 rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 text-sm"
              >
                <User size={16} />
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            <button
              className="p-2 text-gray-600 hover:text-[#008fe5]"
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700 hover:text-[#008fe5] focus:outline-none rounded-lg hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-6 space-y-1 shadow-inner">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.path === "/"}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-base font-semibold transition-all ${isActive
                    ? "bg-blue-50 text-[#008fe5]"
                    : "text-gray-700 hover:bg-blue-50 hover:text-[#008fe5]"
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
              {isLoggedIn ? (
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full text-center border border-red-200 text-red-500 font-bold py-3 rounded-xl transition-all text-sm"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => { openLoginModal(); setMobileMenuOpen(false); }}
                  className="w-full text-center bg-[#008fe5] hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md transition-all text-sm"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
