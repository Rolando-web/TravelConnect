import { X, Printer, Shield, Plane, Hotel, Car, Ticket, CreditCard, MapPin } from "lucide-react";
import { useBooking } from "../../../context/BookingContext";
import InquiryFormSection from "./InquiryFormSection";
import CancellationSection from "./CancellationSection";

export default function BookingDetailsModal() {
  const {
    detailsModalOpen,
    selectedBookingDetails,
    closeBookingDetailsModal,
    cancelBookingTransaction
  } = useBooking();

  if (!detailsModalOpen || !selectedBookingDetails) return null;

  const b = selectedBookingDetails;

  const handlePrintReceipt = () => {
    window.print();
  };

  const services = b.services || {
    flight: "Roundtrip Flight (Included in Package)",
    hotel: "Luxury Hotel / Resort Accommodation",
    car: "Full Travel Vehicle Rental or Transit Pass",
    activities: "Included Sightseeing & Activity Vouchers"
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#008fe5] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Booking &amp; Transaction Details</h2>
              <p className="text-xs text-blue-200">Ref: <span className="font-mono text-white font-bold">{b.id || b.referenceNumber}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReceipt}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer size={14} /> Print Receipt
            </button>

            <button
              onClick={closeBookingDetailsModal}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">

          {/* Top Info Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 border border-gray-100 rounded-2xl p-4 gap-4">
            <div className="flex items-center gap-3">
              {b.img && (
                <img src={b.img} alt={b.name} className="w-16 h-16 rounded-xl object-cover" />
              )}
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  b.status === "upcoming" ? "bg-blue-100 text-blue-700" :
                  b.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                }`}>
                  {b.status}
                </span>
                <h3 className="font-extrabold text-gray-900 text-base mt-1">{b.name || b.packageName}</h3>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin size={11} /> {b.location}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Transaction</span>
              <span className="text-2xl font-black text-gray-900">${(b.amount || b.totalAmount || 0).toLocaleString()}</span>
              {b.paid && (
                <span className="block text-[10px] font-bold text-green-600">✓ PAYMENT CONFIRMED</span>
              )}
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-gray-100 rounded-2xl p-4 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Transaction ID</span>
              <span className="font-mono font-bold text-gray-900">{b.transactionId || "TXN-LOCAL-001"}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Payment Method</span>
              <span className="font-bold text-gray-900 flex items-center gap-1">
                <CreditCard size={12} /> {b.paymentMethod || "Credit Card"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Travel Dates</span>
              <span className="font-semibold text-gray-800">{b.startDate} - {b.endDate}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Guests</span>
              <span className="font-semibold text-gray-800">{b.travellers} Passenger{b.travellers > 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Bundled Package Services Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Included Package Services Breakdown
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-gray-100 p-3.5 rounded-xl flex items-start gap-3">
                <Plane size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-900">Flight Booking</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{services.flight}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-gray-100 p-3.5 rounded-xl flex items-start gap-3">
                <Hotel size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-900">Hotel Accommodation</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{services.hotel}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-gray-100 p-3.5 rounded-xl flex items-start gap-3">
                <Car size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-900">Car Rental / Transport</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{services.car}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-gray-100 p-3.5 rounded-xl flex items-start gap-3">
                <Ticket size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-900">Activities &amp; Tours</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{services.activities}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Inquiry Section Component */}
          <InquiryFormSection booking={b} />

          {/* Cancellation Section Component */}
          {b.status === "upcoming" && (
            <CancellationSection
              bookingId={b.id}
              onCancelConfirm={cancelBookingTransaction}
            />
          )}

        </div>

      </div>
    </div>
  );
}
