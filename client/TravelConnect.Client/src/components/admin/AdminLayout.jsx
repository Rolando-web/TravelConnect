import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  BarChart3,
  BedDouble,
  BriefcaseBusiness,
  Car,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Megaphone,
  Package,
  Plane,
  Settings,
  ShoppingBag,
  UsersRound,
  MessageSquare,
  UserCircle,
  FileText,
  CreditCard,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_ACCESS, ROLE_NAV } from "../../pages/admin/adminConfig";

const ICONS = {
  dashboard: LayoutDashboard,
  users: UsersRound,
  packages: Package,
  flights: Plane,
  hotels: BedDouble,
  cars: Car,
  activities: Globe2,
  destinations: MapPin,
  promotions: Megaphone,
  bookings: ClipboardList,
  customers: UsersRound,
  suppliers: BriefcaseBusiness,
  leads: ShoppingBag,
  inquiries: MessageSquare,
  payments: CircleDollarSign,
  reports: BarChart3,
  settings: Settings,
  profile: UserCircle,
  support: MessageSquare,
  subscriptions: CreditCard,
};

const GROUPS = {
  Navigation: ["dashboard"],
  People: ["users", "customers", "suppliers"],
  Catalog: ["packages", "destinations"],
  Operations: ["bookings", "payments"],
  Growth: ["leads", "promotions", "inquiries"],
  Services: ["flights", "hotels", "cars", "activities"],
  System: ["reports", "settings", "subscriptions", "support", "profile"],
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const role = user?.role || "Super Admin";
  const access = ADMIN_ACCESS[role] || {};
  const roleNav = useMemo(() => {
    const nav = ROLE_NAV[role] || ROLE_NAV["Super Admin"];
    return nav.map(([key, label]) => ({ key, label }));
  }, [role]);
  const roleKeys = useMemo(() => new Set(roleNav.map((n) => n.key)), [roleNav]);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const navLabel = (key) => {
    const found = roleNav.find((n) => n.key === key);
    return found ? found.label : key;
  };

  return (
    <div className="h-screen bg-[#0B132B] text-white flex overflow-hidden font-sans">
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-white/10 bg-[#111D37] transition-all duration-300 ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="px-5 py-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#06D6A0]/20 flex items-center justify-center shrink-0">
            <Globe2 className="text-[#06D6A0]" size={22} />
          </div>
          {!collapsed && (
            <div>
              <div className="text-xl font-black tracking-tight">
                Travel<span className="text-[#06D6A0]">Connect</span>
              </div>
              <p className="text-[10px] tracking-[.2em] uppercase text-slate-400">
                Admin Portal
              </p>
            </div>
          )}
        </div>




        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-5 space-y-6">
          <NavGroups
            roleKeys={roleKeys}
            navLabel={navLabel}
            collapsed={collapsed}
            onNavigate={() => {}}
          />
        </nav>

        <div className="border-t border-white/10 p-3 space-y-2">
          <button
            onClick={async () => { await logout(); navigate("/"); }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition w-full"
          >
            <LogOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/10 transition w-full"
          >
            <ChevronLeft
              size={18}
              className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-white/10 bg-[#111D37]/75 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <div className="truncate">
              <span className="text-slate-400 text-sm">TravelConnect / </span>
              <span className="font-semibold text-sm">{navLabel(window.location.pathname.split("/")[2] || "dashboard")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-sm font-semibold">{user?.name || "Admin"}</p>
              <p className="text-xs text-[#06D6A0]">{role}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 lg:p-8">
          <Outlet context={{ role, access }} />
        </div>
      </main>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[#111D37] flex flex-col border-r border-white/10 shadow-2xl">
            <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#06D6A0]/20 flex items-center justify-center">
                  <Globe2 className="text-[#06D6A0]" size={22} />
                </div>
                <div>
                  <div className="text-xl font-black tracking-tight">
                    Travel<span className="text-[#06D6A0]">Connect</span>
                  </div>
                  <p className="text-[10px] tracking-[.2em] uppercase text-slate-400">
                    Admin Portal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>


            <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-5 space-y-6">
              <NavGroups
                roleKeys={roleKeys}
                navLabel={navLabel}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>

            <div className="border-t border-white/10 p-3 space-y-2">
              <button
                onClick={async () => { await logout(); navigate("/"); }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition w-full"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavGroups({ roleKeys, navLabel, collapsed, onNavigate }) {
  return (
    <>
      {Object.entries(GROUPS).map(([groupLabel, keys]) => {
        const visible = keys.filter((k) => roleKeys.has(k));
        if (visible.length === 0) return null;
        return (
          <div key={groupLabel}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[11px] font-extrabold tracking-[.18em] text-white/80 uppercase">
                {groupLabel}
              </p>
            )}
            {collapsed && <div className="mx-3 mb-3 h-px bg-white/10" />}
            <div className="space-y-1">
              {visible.map((key) => {
                const Icon = ICONS[key] || FileText;
                return (
                  <NavLink
                    key={key}
                    to={`/admin/${key}`}
                    end={key === "dashboard"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-normal transition ${
                        isActive
                          ? "bg-[#06D6A0] text-[#0B132B] shadow-md shadow-[#06D6A0]/25 font-bold"
                          : "text-slate-200 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={18} className={collapsed ? "mx-auto" : "shrink-0"} />
                    {!collapsed && <span>{navLabel(key)}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
