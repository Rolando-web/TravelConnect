import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { ADMIN_ROLES } from "../../../pages/admin/adminConfig";
import { usePublicStats } from "../../../hooks/usePublicStats";
import logoImg from "../../../assets/logo.png";

const PANEL_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=900&q=85",
    place: "Santorini",
    caption: "White-washed villages perched above the Aegean Sea",
  },
  {
    image: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=900&q=85",
    place: "Giza, Egypt",
    caption: "Timeless pyramids rising from the golden desert",
  },
  {
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=85",
    place: "Bali, Indonesia",
    caption: "Lush terraces, sacred temples, and ocean breezes",
  },
  {
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=85",
    place: "Maldives",
    caption: "Crystal lagoons and overwater escapes",
  },
];

export default function SignInModal() {
  const { loginModalOpen, closeLoginModal, loginWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  const { stats } = usePublicStats();

  const emailRef = useRef(null);

  /* Auto-focus email field when modal opens (cleanup the timer) */
  useEffect(() => {
    if (!loginModalOpen) return;
    const t = setTimeout(() => emailRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [loginModalOpen]);

  /* Autoplay the image carousel while the modal is open */
  useEffect(() => {
    if (!loginModalOpen) return;
    const interval = setInterval(() => {
      setSlideIdx((i) => (i + 1) % PANEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [loginModalOpen]);

  /* Close on Escape key */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") closeLoginModal(); };
    if (loginModalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loginModalOpen, closeLoginModal]);

  /* Prevent body scroll while open */
  useEffect(() => {
    document.body.style.overflow = loginModalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [loginModalOpen]);

  if (!loginModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      const result = await loginWithEmail(email, password);
      if (ADMIN_ROLES.includes(result.role)) {
        navigate("/admin", { replace: true });
      }
    } catch (err) {
      if (err.message === "ACCOUNT_NOT_FOUND") {
        setError("No account found with this email. Please contact your administrator.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Google button (Firebase Auth) ── */
  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await loginWithGoogle();
      if (ADMIN_ROLES.includes(result.role)) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/bookings", { replace: true });
      }
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) closeLoginModal(); }}
    >
      {/* Modal card */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left: form panel ────────────────────────────── */}
        <div className="flex-1 p-8 sm:p-10 overflow-y-auto">
          {/* Close button */}
          <button
            onClick={closeLoginModal}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition z-10"
            aria-label="Close login modal"
          >
            <X size={16} />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-7">
            <img
              src={logoImg}
              alt="TravelConnect"
              className="h-9 w-auto object-contain"
              style={{ mixBlendMode: "multiply" }}
            />
            <span className="font-extrabold text-gray-900 text-lg tracking-tight">
              Travel<span className="text-[#008fe5]">Connect</span>
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-400 text-sm mb-7">Sign in to access your travel dashboard</p>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-[#008fe5] hover:bg-blue-50/50 rounded-2xl py-3 text-sm font-semibold text-gray-700 transition-all duration-200 mb-5"
          >
            <svg viewBox="0 0 48 48" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-gray-100" />
            <span className="text-xs text-gray-400 font-medium">or with email</span>
            <div className="flex-1 border-t border-gray-100" />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-500 text-xs rounded-xl px-4 py-2.5 flex items-center gap-2">
              <X size={13} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div className="relative">
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full pl-4 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] transition bg-white placeholder:text-gray-400"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-4 pr-11 py-3.5 border border-gray-200 rounded-2xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] transition bg-white placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Forgot */}
            <div className="flex justify-end">
              <button type="button" className="text-[#008fe5] text-xs font-semibold hover:underline">
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-400/25 hover:-translate-y-0.5 transition-all duration-200 text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5 leading-relaxed">
            By signing in you agree to our{" "}
            <span className="text-gray-500 font-semibold cursor-pointer hover:underline">Terms of Service</span>{" "}
            and{" "}
            <span className="text-gray-500 font-semibold cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>

        {/* ── Right: image panel (carousel) ─────────────────── */}
        <div className="hidden sm:block relative w-[340px] flex-shrink-0 overflow-hidden">
          {PANEL_SLIDES.map((slide, i) => (
            <img
              key={slide.place}
              src={slide.image}
              alt={slide.place}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === slideIdx ? "opacity-100" : "opacity-0"}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute top-6 right-6 flex flex-col gap-3">
            {[
              { val: `${stats?.happyTravelers ? new Intl.NumberFormat("en-US").format(stats.happyTravelers) + "+" : "48k+"}`, label: "Travelers" },
              { val: `${stats?.avgRating ? Number(stats.avgRating).toFixed(1) + "★" : "4.9★"}`, label: "Rating" },
              { val: `${stats?.destinations ? `${stats.destinations}+` : "120+"}`, label: "Destinations" },
            ].map(({ val, label }) => (
              <div
                key={label}
                className="bg-black/40 backdrop-blur-md border border-white/15 text-white rounded-xl px-3 py-2 text-center min-w-[70px]"
              >
                <p className="font-extrabold text-sm leading-none">{val}</p>
                <p className="text-white/70 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="absolute bottom-6 left-5 right-5">
            <p className="text-[#f9a832] text-[10px] font-bold uppercase tracking-widest mb-1">
              {PANEL_SLIDES[slideIdx].place}
            </p>
            <p className="text-white font-extrabold text-xl leading-snug">
              {PANEL_SLIDES[slideIdx].caption}
            </p>
            <div className="flex gap-1.5 mt-3">
              {PANEL_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show slide ${i + 1}`}
                  onClick={() => setSlideIdx(i)}
                  className={`rounded-full cursor-pointer transition-all duration-300 ${i === slideIdx ? "w-5 h-1.5 bg-[#f9a832]" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
