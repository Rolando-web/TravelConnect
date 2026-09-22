import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import {
  Download,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Inbox,
  Info,
} from "lucide-react";
import { pageMeta } from "./adminConfig";
import ProfilePage from "./ProfilePage";
import SupportPage from "./SupportPage";
import HelpdeskInboxPage from "./HelpdeskInboxPage";
import SystemSettingsPage from "./SystemSettingsPage";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";
import {
  usersApi,
  flightsApi,
  hotelsApi,
  carsApi,
  activitiesApi,
  inquiriesApi,
  destinationsApi,
  suppliersApi,
  promotionsApi,
  leadsApi,
} from "../../services/api";

const customPages = { profile: ProfilePage, support: SupportPage, settings: SystemSettingsPage, helpdesk: HelpdeskInboxPage };

const FALLBACK_FLIGHT_IMG = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80";

const statusBadge = {
  Active: "badge-green",
  Confirmed: "badge-green",
  Paid: "badge-green",
  Completed: "badge-green",
  Featured: "badge-green",
  "Closed Won": "badge-green",
  Resolved: "badge-green",
  Replied: "badge-cyan",
  Pending: "badge-orange",
  Review: "badge-orange",
  Partial: "badge-orange",
  Scheduled: "badge-orange",
  Negotiation: "badge-orange",
  New: "badge-orange",
  Qualified: "badge-orange",
  Upcoming: "badge-cyan",
  Proposal: "badge-purple",
  Refunded: "badge-purple",
  Cancelled: "badge-red",
  Expired: "badge-red",
  Inactive: "badge-red",
};

function Badge({ children }) {
  return <span className={statusBadge[children] || "badge-cyan"}>{children || "—"}</span>;
}

function RateCell({ value, suffix }) {
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="text-cyan-accent font-black text-base tabular-nums">
        ₱{Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      {suffix && <span className="text-xs text-text-secondary mt-0.5">{suffix}</span>}
    </span>
  );
}

function StarRating({ value }) {
  const v = Number(value || 0).toFixed(1);
  return (
    <span className="font-semibold tabular-nums text-badge-orange">{v}</span>
  );
}

function ImageCell({ primary, sub, imageUrl }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={imageUrl || FALLBACK_FLIGHT_IMG}
        alt={primary || ""}
        className="h-10 w-14 rounded-lg object-cover shrink-0"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_FLIGHT_IMG;
        }}
      />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{primary}</span>
        {sub && <span className="block text-xs text-text-secondary truncate">{sub}</span>}
      </span>
    </div>
  );
}

function money(v) {
  return v == null ? "₱0" : `₱${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function dateStr(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toISOString().slice(0, 10);
}

// Per-page configuration mapping to the backend resources.
const PAGES = {
  users: {
    api: usersApi,
    singular: "User",
    fields: [
      { key: "displayName", label: "Name", required: true },
      { key: "email", label: "Email", required: true },
      { key: "phone", label: "Phone" },
      { key: "role", label: "Role", type: "select", options: ["Super Admin", "Agency Staff", "Finance Staff", "Supplier"] },
      { key: "department", label: "Department" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
    ],
    cols: [
      { h: "NAME", c: (r) => r.displayName || "—" },
      { h: "EMAIL", c: (r) => r.email || "—" },
      { h: "ROLE", c: (r) => r.role || "—" },
      { h: "DEPARTMENT", c: (r) => r.department || "—" },
      { h: "STATUS", c: (r) => r.status || "Active", badge: true },
    ],
    stats: (d) => [
      ["Total Users", String(d.length), `${d.filter((r) => r.status === "Active").length} active`],
      ["Active", String(d.filter((r) => r.status === "Active").length), "Enabled accounts"],
      ["Admins", String(d.filter((r) => /admin/i.test(r.role || "")).length), "Admin roles"],
      ["Departments", new Set(d.map((r) => r.department).filter(Boolean)).size, "Unique departments"],
    ],
  },
  flights: {
    api: flightsApi,
    singular: "Flight",
    fields: [
      { key: "airline", label: "Airline", required: true },
      { key: "flightNumber", label: "Flight Number", required: true },
      { key: "departureCity", label: "Departure City", required: true },
      { key: "arrivalCity", label: "Arrival City", required: true },
      { key: "departureDate", label: "Departure Date", type: "date" },
      { key: "departureTime", label: "Departure Time" },
      { key: "arrivalTime", label: "Arrival Time" },
      { key: "price", label: "Price (₱)", type: "number" },
      { key: "class", label: "Class", type: "select", options: ["Economy", "Premium", "Business", "First"] },
      { key: "seatsAvailable", label: "Seats Available", type: "number" },
      { key: "imageUrl", label: "Image URL" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
    ],
    cols: [
      {
        h: "FLIGHT",
        img: true,
        c: (r) => `${r.airline || "—"}`,
        sub: (r) => `${r.flightNumber || ""}`.trim(),
      },
      {
        h: "ROUTE",
        c: (r) => (
          <span className="flex flex-col">
            <span>{r.departureCity || "—"} → {r.arrivalCity || "—"}</span>
            {r.departureTime && (
              <span className="text-xs text-text-secondary">{r.departureTime}—{r.arrivalTime || "?"}</span>
            )}
          </span>
        ),
      },
      { h: "CLASS", c: (r) => r.class || "Economy" },
      {
        h: "PRICE",
        rate: (r) => r.price,
        suffix: "per person",
      },
      { h: "SEATS", c: (r) => r.seatsAvailable ?? 0 },
      { h: "STATUS", c: (r) => r.status || "Active", badge: true },
    ],
    stats: (d) => [
      ["Total Flights", String(d.length), "Active routes"],
      ["Active", String(d.filter((r) => r.status === "Active").length), "Available flights"],
      ["Economy", String(d.filter((r) => (r.class || "Economy") === "Economy").length), "Economy class"],
      ["Total Seats", String(d.reduce((s, r) => s + (r.seatsAvailable || 0), 0)), "Open seats"],
    ],
  },
  hotels: {
    api: hotelsApi,
    singular: "Hotel",
    fields: [
      { key: "name", label: "Hotel Name", required: true },
      { key: "location", label: "Location", required: true },
      { key: "description", label: "Description", type: "textarea", rows: 3 },
      { key: "pricePerNight", label: "Price/Night (₱)", type: "number" },
      { key: "rating", label: "Rating", type: "number" },
      { key: "reviews", label: "Reviews", type: "number" },
      { key: "roomsAvailable", label: "Rooms Available", type: "number" },
      { key: "amenities", label: "Amenities" },
      { key: "imageUrl", label: "Image URL" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
    ],
    cols: [
      { h: "HOTEL", img: true, c: (r) => r.name || "—", sub: (r) => r.location || "—" },
      {
        h: "PRICE/NIGHT",
        rate: (r) => r.pricePerNight,
        suffix: "per night",
      },
      {
        h: "RATING",
        star: (r) => r.rating ?? 0,
      },
      { h: "ROOMS", c: (r) => r.roomsAvailable ?? 0 },
      { h: "STATUS", c: (r) => r.status || "Active", badge: true },
    ],
    stats: (d) => [
      ["Total Hotels", String(d.length), "Properties"],
      ["Active", String(d.filter((r) => r.status === "Active").length), "Available stays"],
      ["Avg Rating", d.length ? (d.reduce((s, r) => s + (r.rating || 0), 0) / d.length).toFixed(1) : "0", "Average rating"],
      ["Rooms", String(d.reduce((s, r) => s + (r.roomsAvailable || 0), 0)), "Total room inventory"],
    ],
  },
  cars: {
    api: carsApi,
    singular: "Car",
    fields: [
      { key: "name", label: "Vehicle Name", required: true },
      { key: "type", label: "Type", type: "select", options: ["SUV", "Sedan", "Van", "Convertible", "Truck"] },
      { key: "location", label: "Location", required: true },
      { key: "pricePerDay", label: "Price/Day (₱)", type: "number" },
      { key: "transmission", label: "Transmission", type: "select", options: ["Automatic", "Manual"] },
      { key: "seats", label: "Seats", type: "number" },
      { key: "fuelType", label: "Fuel Type", type: "select", options: ["Gasoline", "Diesel", "Electric", "Hybrid"] },
      { key: "imageUrl", label: "Image URL" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
    ],
    cols: [
      { h: "VEHICLE", img: true, c: (r) => r.name || "—", sub: (r) => r.type || "—" },
      { h: "LOCATION", c: (r) => r.location || "—" },
      {
        h: "PRICE/DAY",
        rate: (r) => r.pricePerDay,
        suffix: "per day",
      },
      { h: "SPECS", c: (r) => `${r.transmission || "—"} · ${r.seats ?? "—"} seats` },
      { h: "STATUS", c: (r) => r.status || "Active", badge: true },
    ],
    stats: (d) => [
      ["Total Cars", String(d.length), "Fleet"],
      ["Active", String(d.filter((r) => r.status === "Active").length), "Available rentals"],
      ["Automatic", String(d.filter((r) => (r.transmission || "Automatic") === "Automatic").length), "Auto transmission"],
      ["Total Seats", String(d.reduce((s, r) => s + (r.seats || 0), 0)), "Fleet capacity"],
    ],
  },
  activities: {
    api: activitiesApi,
    singular: "Activity",
    fields: [
      { key: "name", label: "Activity Name", required: true },
      { key: "location", label: "Location", required: true },
      { key: "description", label: "Description", type: "textarea", rows: 3 },
      { key: "price", label: "Price (₱)", type: "number" },
      { key: "duration", label: "Duration" },
      { key: "rating", label: "Rating", type: "number" },
      { key: "reviews", label: "Reviews", type: "number" },
      { key: "imageUrl", label: "Image URL" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
    ],
    cols: [
      { h: "ACTIVITY", img: true, c: (r) => r.name || "—", sub: (r) => r.location || "—" },
      { h: "DURATION", c: (r) => r.duration || "—" },
      {
        h: "PRICE",
        rate: (r) => r.price,
        suffix: "per person",
      },
      {
        h: "RATING",
        star: (r) => r.rating ?? 0,
      },
      { h: "REVIEWS", c: (r) => r.reviews ?? 0 },
      { h: "STATUS", c: (r) => r.status || "Active", badge: true },
    ],
    stats: (d) => [
      ["Total Activities", String(d.length), "Experiences"],
      ["Active", String(d.filter((r) => r.status === "Active").length), "Bookable"],
      ["Avg Rating", d.length ? (d.reduce((s, r) => s + (r.rating || 0), 0) / d.length).toFixed(1) : "0", "Average rating"],
      ["Reviews", String(d.reduce((s, r) => s + (r.reviews || 0), 0)), "Total reviews"],
    ],
  },
  inquiries: {
    api: inquiriesApi,
    singular: "Inquiry",
    hint: "Customer messages land here when someone submits the contact / booking check-in form on the site or the /agencies page. Open a record to read the full message, then set Status to Replied and add your Reply below it.",
    fields: [
      { key: "customerName", label: "Customer Name", required: true },
      { key: "customerEmail", label: "Customer Email" },
      { key: "subject", label: "Subject", required: true },
      { key: "category", label: "Category", type: "select", options: ["General", "Flight", "Hotel", "Transport", "Activity", "Payment"] },
      { key: "message", label: "Message", type: "textarea", rows: 3 },
      { key: "status", label: "Status", type: "select", options: ["Pending", "Replied", "Resolved"] },
      { key: "reply", label: "Reply", type: "textarea", rows: 3 },
    ],
    cols: [
      { h: "CUSTOMER", c: (r) => <span className="flex flex-col"><span>{r.customerName || "—"}</span>{r.customerEmail && <span className="text-xs text-text-secondary">{r.customerEmail}</span>}</span> },
      { h: "SUBJECT", c: (r) => r.subject || "—" },
      { h: "MESSAGE", c: (r) => <span className="block max-w-72 truncate text-text-secondary" title={r.message}>{r.message || "—"}</span> },
      { h: "CATEGORY", c: (r) => r.category || "General" },
      { h: "DATE", c: (r) => dateStr(r.createdAt) },
      { h: "STATUS", c: (r) => r.status || "Pending", badge: true },
    ],
    stats: (d) => [
      ["Total Inquiries", String(d.length), "All tickets"],
      ["Pending", String(d.filter((r) => (r.status || "Pending") === "Pending").length), "Awaiting reply"],
      ["Replied", String(d.filter((r) => (r.status || "") === "Replied").length), "Replied"],
      ["Resolved", String(d.filter((r) => (r.status || "") === "Resolved").length), "Closed"],
    ],
  },
  destinations: {
    api: destinationsApi,
    singular: "Destination",
    cols: [
      { h: "DESTINATION", c: (r) => r.name || "—" },
      { h: "REGION", c: (r) => r.region || "—" },
      { h: "CATEGORY", c: (r) => r.category || "—" },
      { h: "STATUS", c: (r) => r.status || "Active", badge: true },
    ],
    stats: (d) => [
      ["Total Destinations", String(d.length), "All places"],
      ["Active", String(d.filter((r) => r.status === "Active").length), "Live destinations"],
      ["Featured", String(d.filter((r) => (r.status || "") === "Featured").length), "Featured"],
      ["Regions", new Set(d.map((r) => r.region).filter(Boolean)).size, "Unique regions"],
    ],
  },
  suppliers: {
    api: suppliersApi,
    singular: "Supplier",
    cols: [
      { h: "COMPANY", c: (r) => r.companyName || "—" },
      { h: "CONTACT", c: (r) => r.contactName || "—" },
      { h: "TYPE", c: (r) => r.type || "—" },
      { h: "RATING", c: (r) => (r.rating ?? 0).toFixed(1) },
      { h: "STATUS", c: (r) => r.status || "Active", badge: true },
    ],
    stats: (d) => [
      ["Total Suppliers", String(d.length), "Partners"],
      ["Active", String(d.filter((r) => r.status === "Active").length), "Active partners"],
      ["Avg Rating", d.length ? (d.reduce((s, r) => s + (r.rating || 0), 0) / d.length).toFixed(1) : "0", "Average rating"],
      ["Types", new Set(d.map((r) => r.type).filter(Boolean)).size, "Supplier categories"],
    ],
  },
  promotions: {
    api: promotionsApi,
    singular: "Promotion",
    cols: [
      { h: "CODE", c: (r) => r.code || "—" },
      { h: "CAMPAIGN", c: (r) => r.campaignName || "—" },
      { h: "DISCOUNT", c: (r) => (r.discountType === "Fixed" ? money(r.discount) : `${r.discount}%`) },
      { h: "USES", c: (r) => `${r.usedCount ?? 0}/${r.maxUses ?? 0}` },
      { h: "EXPIRES", c: (r) => r.expiresAt || "—" },
      { h: "STATUS", c: (r) => r.status || "Active", badge: true },
    ],
    stats: (d) => [
      ["Total Promos", String(d.length), "All campaigns"],
      ["Active", String(d.filter((r) => (r.status || "Active") === "Active").length), "Live promos"],
      ["Total Uses", String(d.reduce((s, r) => s + (r.usedCount || 0), 0)), "Codes redeemed"],
      ["Expired", String(d.filter((r) => (r.status || "") === "Expired").length), "Expired campaigns"],
    ],
  },
  leads: {
    api: leadsApi,
    singular: "Lead",
    cols: [
      { h: "LEAD", c: (r) => r.name || "—" },
      { h: "EMAIL", c: (r) => r.email || "—" },
      { h: "INTEREST", c: (r) => r.interest || "—" },
      { h: "STAGE", c: (r) => r.stage || "New", badge: true },
      { h: "ASSIGNED", c: (r) => r.assignedTo || "—" },
      { h: "LAST CONTACT", c: (r) => r.lastContact || "—" },
    ],
    stats: (d) => [
      ["Total Leads", String(d.length), "All leads"],
      ["Open", String(d.filter((r) => !["Won", "Lost"].includes(r.stage)).length), "In pipeline"],
      ["Won", String(d.filter((r) => (r.stage || "") === "Won").length), "Converted"],
      ["Lost", String(d.filter((r) => (r.stage || "") === "Lost").length), "Lost deals"],
    ],
  },
};

export default function AdminManagementPage() {
  const { page } = useParams();
  const { access } = useOutletContext();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [saving, setSaving] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const PAGE_SIZE = 10;

  const config = PAGES[page];
  const [title, subtitle] = pageMeta[page] || ["Management", "Manage your TravelConnect records"];
  const permission = access[page];

  const load = useCallback(() => {
    if (!config) return;
    config.api
      .list()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => {
        setRows([]);
        setError(err.message || "Failed to load data");
      })
      .finally(() => setLoading(false));
  }, [config]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (mode, data = null) => setModal({ open: true, mode, data });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") await config.api.create(form);
      else await config.api.update(modal.data.id, { ...form, id: modal.data.id });
      setModal({ open: false, mode: "add", data: null });
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE);
  // Reset page when query or page route changes
  useEffect(() => setTablePage(1), [query]);

  if (!permission)
    return (
      <section className="grid min-h-[58vh] place-items-center text-center">
        <div>
          <ShieldAlert className="mx-auto text-badge-orange" size={48} />
          <h1 className="text-2xl font-black mt-4">Access restricted</h1>
          <p className="text-text-secondary mt-2">
            Your role does not have access to {title.toLowerCase()}.
          </p>
        </div>
      </section>
    );

  const CustomPage = customPages[page];
  if (CustomPage) return <CustomPage />;

  const stats = config ? config.stats(rows) : [];
  const cols = config ? config.cols : [];
  const canManage = permission === "Manage";

  return (
    <>
      {/* Header */}
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-cyan-accent text-sm font-medium">{permission} access</p>
          <h1 className="text-3xl font-black mt-1">{title}</h1>
          <p className="text-text-secondary mt-2">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setNotice("Export prepared.")} className="btn-secondary">
            <Download size={16} /> Export
          </button>
          {canManage && config && (
            <button onClick={() => openModal("add")} className="btn-primary">
              <Plus size={17} /> Add {config.singular}
            </button>
          )}
        </div>
      </section>

      {notice && (
        <div className="mb-4 rounded-xl border border-badge-green/30 bg-badge-green/10 px-4 py-3 text-sm text-badge-green">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-badge-red/30 bg-badge-red/10 px-4 py-3 text-sm text-badge-red">
          {error}
        </div>
      )}

      {config?.hint && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-cyan-accent/25 bg-cyan-accent/5 px-4 py-3.5">
          <span className="mt-0.5 w-8 h-8 shrink-0 grid place-items-center rounded-lg bg-cyan-accent/15 text-cyan-accent">
            <Info size={16} />
          </span>
          <p className="text-sm text-text-primary leading-relaxed">{config.hint}</p>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {stats.map(([label, value, note]) => (
          <StatCard key={label} label={label} value={value} note={note} />
        ))}
        {stats.length === 0 && (
          <StatCard label="No records" value="0" note="No data available yet" />
        )}
      </div>

      {/* Filter Bar */}
      <div className="card mb-5">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 min-w-60 gap-2 items-center rounded-xl border border-navy-700 bg-navy-900 px-3 py-2">
            <Search size={17} className="text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary"
            />
          </label>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-text-secondary" />
            <button
              onClick={() => setActiveFilter("All")}
              className={activeFilter === "All" ? "filter-pill-active" : "filter-pill"}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="table-header">
              <tr>
                {cols.map((c) => (
                  <th key={c.h} className="px-5 py-3 font-semibold text-text-secondary">
                    {c.h}
                  </th>
                ))}
                <th className="px-5 py-3 font-semibold text-text-secondary">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={cols.length + 1} className="px-5 py-10 text-center text-text-secondary">
                    Loading data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={cols.length + 1}
                    className="px-5 py-14 text-center"
                  >
                    <Inbox size={36} className="mx-auto text-text-secondary mb-3" />
                    <p className="text-text-secondary font-semibold">No records found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "This table is currently empty."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr key={row.id ?? i} className="table-row">
                    {cols.map((c) => (
                      <td key={c.h} className="px-5 py-4">
                        {c.badge ? (
                          <Badge>{c.c(row)}</Badge>
                        ) : c.img ? (
                          <ImageCell
                            primary={c.c(row)}
                            sub={c.sub ? c.sub(row) : null}
                            imageUrl={row.imageUrl}
                          />
                        ) : c.rate ? (
                          <RateCell value={c.rate(row)} suffix={c.suffix} />
                        ) : c.star ? (
                          <StarRating value={c.star(row)} />
                        ) : (
                          <span className="text-text-primary">{c.c(row)}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button className="text-xs text-cyan-accent hover:underline" onClick={() => openModal("view", row)}>
                          View
                        </button>
                        {canManage && (
                          <button className="text-xs text-text-secondary hover:text-badge-orange transition" onClick={() => openModal("edit", row)}>
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={tablePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setTablePage} />
      </section>

      {config && (
        <CrudModal
          open={modal.open}
          mode={modal.mode}
          title={`${modal.mode === "add" ? "Add" : modal.mode === "edit" ? "Edit" : "View"} ${config.singular}`}
          fields={config.fields}
          data={modal.data}
          onClose={() => setModal({ open: false, mode: "add", data: null })}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </>
  );
}
