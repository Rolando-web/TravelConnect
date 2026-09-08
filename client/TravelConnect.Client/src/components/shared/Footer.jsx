import { Link } from "react-router-dom";
import logoImg from "../../assets/logo.png";
import { Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e, targetId) => {
    if (targetId.startsWith("#")) {
      e.preventDefault();
      const element = document.getElementById(targetId.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-8 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-slate-800">
          
          {/* Logo & Description */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-white/10 rounded-lg p-1 group-hover:bg-white/15 transition-all">
                <img 
                  src={logoImg} 
                  alt="Travel Connect Logo" 
                  className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-white leading-none tracking-tight">
                  Travel<span className="text-[#008fe5]">Connect</span>
                </span>
                <span className="text-[8px] uppercase tracking-[0.25em] font-bold text-slate-400 mt-0.5">
                  Wander More
                </span>
              </div>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed pt-2">
              Explore the world with ease and comfort. Travel Connect is a premium travel platform curating extraordinary, customized journeys for travelers worldwide.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="p-2 rounded-full bg-slate-900 hover:bg-[#008fe5] hover:text-white transition-all duration-300" aria-label="Facebook">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                </svg>
              </a>
              <a href="#" className="p-2 rounded-full bg-slate-900 hover:bg-[#008fe5] hover:text-white transition-all duration-300" aria-label="Twitter">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className="p-2 rounded-full bg-slate-900 hover:bg-[#008fe5] hover:text-white transition-all duration-300" aria-label="Instagram">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href="#" className="p-2 rounded-full bg-slate-900 hover:bg-[#008fe5] hover:text-white transition-all duration-300" aria-label="Youtube">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </a>
            </div>
          </div>

          {/* Destinations Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Destinations</h4>
            <ul className="space-y-2.5 text-sm">
              {["Rome, Italy", "Paris, France", "Tokyo, Japan", "Bali, Indonesia", "Sydney, Australia"].map((dest) => (
                <li key={dest}>
                  <a href="#destinations" onClick={(e) => handleLinkClick(e, "#destinations")} className="hover:text-white hover:underline transition-colors">
                    {dest}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Packages Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Packages</h4>
            <ul className="space-y-2.5 text-sm">
              {["Featured Packages", "Exclusive Summer Deals", "Winter Special Tours", "Luxury Cruises", "Custom Itineraries"].map((pkg) => (
                <li key={pkg}>
                  <a href="#packages" onClick={(e) => handleLinkClick(e, "#packages")} className="hover:text-white hover:underline transition-colors">
                    {pkg}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Contact Us</h4>
            <ul className="space-y-3.5 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin size={18} className="text-[#008fe5] shrink-0 mt-0.5" />
                <span>123 Paradise Boulevard, Suite 500, San Francisco, CA</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={18} className="text-[#008fe5] shrink-0" />
                <span>+1 (800) 555-0199</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={18} className="text-[#008fe5] shrink-0" />
                <span>support@travelconnect.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} Travel Connect. All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Cookie settings</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
