import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  BarChart3,
  BedDouble,
  BriefcaseBusiness,
  Car,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Package,
  Plane,
  Settings,
  ShoppingBag,
  UsersRound,
  MessageSquare,
  UserCircle,
  FileText,
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
};

const GROUPS = {
  Navigation: ["dashboard"],
  People: ["users", "customers", "suppliers"],
  Catalog: ["packages", "destinations"],
  Operations: ["bookings", "payments"],
  Growth: ["leads", "promotions", "inquiries"],
  Services: ["flights", "hotels", "cars", "activities"],
  System: ["reports", "settings", "support", "profile"],
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
  const [openGroups, setOpenGroups] = useState(
    Object.fromEntries(Object.keys(GROUPS).map((g) => [g, true]))
  );
  const navigate = useNavigate();

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const navLabel = (key) => {
    const found = roleNav.find((n) => n.key === key);
    return found ? found.label : key;
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-white flex overflow-x-hidden font-sans">
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-white/10 bg-[#111D37] transition-all duration-300 ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="px-5 py-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00A8FF]/20 flex items-center justify-center shrink-0">
            <Globe2 className="text-[#00A8FF]" size={22} />
          </div>
          {!collapsed && (
            <div>
              <div className="text-xl font-black tracking-tight">
                Travel<span className="text-[#00A8FF]">Connect</span>
              </div>
              <p className="text-[10px] tracking-[.2em] uppercase text-slate-400">
                Admin Portal
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mx-4 mt-5 rounded-xl bg-[#00A8FF]/10 border border-[#00A8FF]/30 p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00A8FF] flex items-center justify-center text-[#0B132B] font-bold text-sm shrink-0">
                {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "TC"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.name || "Admin"}</p>
                <p className="text-xs text-[#00A8FF] truncate">{role}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5">
          {Object.entries(GROUPS).map(([groupLabel, keys]) => {
            const visible = keys.filter((k) => roleKeys.has(k));
            if (visible.length === 0) return null;
            return (
              <div key={groupLabel}>
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(groupLabel)}
                    className="flex items-center justify-between w-full px-3 mb-2"
                  >
                    <span className="text-[10px] font-bold tracking-[.15em] text-slate-400 uppercase">
                      {groupLabel}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform ${
                        openGroups[groupLabel] ? "" : "-rotate-90"
                      }`}
                    />
                  </button>
                )}
                {(collapsed || openGroups[groupLabel]) && (
                  <div className="space-y-1">
                    {visible.map((key) => {
                      const Icon = ICONS[key] || FileText;
                      return (
                        <NavLink
                          key={key}
                          to={`/admin/${key}`}
                          end={key === "dashboard"}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                              isActive
                                ? "bg-white text-[#0B132B] font-bold"
                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                            }`
                          }
                        >
                          <Icon size={18} />
                          {!collapsed && <span>{navLabel(key)}</span>}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="h-16 px-6 lg:px-8 flex items-center justify-between border-b border-white/10 bg-[#111D37]/75 backdrop-blur-sm">
          <div>
            <span className="text-slate-400 text-sm">TravelConnect / </span>
            <span className="font-semibold text-sm">{navLabel(window.location.pathname.split("/")[2] || "dashboard")}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{user?.name || "Admin"}</p>
              <p className="text-xs text-[#00A8FF]">{role}</p>
            </div>
          </div>
        </header>

        <div className="p-5 lg:p-8">
          <Outlet context={{ role, access }} />
        </div>
      </main>
    </div>
  );
}
