import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { sendCustomerInquiry } from "../../../services/api";

export default function InquiryFormSection({ booking }) {
  const [inquirySubject, setInquirySubject] = useState("");
  const [inquiryText, setInquiryText] = useState("");
  const [inquirySent, setInquirySent] = useState(false);
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);

  const handleSendInquiry = async (e) => {
    e.preventDefault();
    if (!inquiryText.trim()) return;

    setIsSendingInquiry(true);
    await sendCustomerInquiry({
      customerName: booking.customerName || "Customer",
      customerEmail: booking.customerEmail || "customer@example.com",
      subject: inquirySubject || `Inquiry for ${booking.id || booking.referenceNumber}`,
      message: inquiryText,
      bookingReference: booking.id || booking.referenceNumber
    });
    setIsSendingInquiry(false);
    setInquirySent(true);
    setInquiryText("");
    setInquirySubject("");
    setTimeout(() => setInquirySent(false), 4000);
  };

  return (
    <div className="border-t border-gray-100 pt-5">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        Send Customer Inquiry to Agency Staff
      </h4>

      {inquirySent ? (
        <div className="bg-green-50 text-green-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={15} /> Your inquiry has been sent to TravelConnect support staff.
        </div>
      ) : (
        <form onSubmit={handleSendInquiry} className="space-y-3">
          <input
            type="text"
            value={inquirySubject}
            onChange={(e) => setInquirySubject(e.target.value)}
            placeholder="Inquiry Subject (e.g., Flight Time Change, Special Dietary Request)"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#008fe5]"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={inquiryText}
              onChange={(e) => setInquiryText(e.target.value)}
              placeholder="Type your message or inquiry here..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#008fe5]"
            />
            <button
              type="submit"
              disabled={isSendingInquiry || !inquiryText.trim()}
              className="bg-[#008fe5] hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1 disabled:opacity-50"
            >
              <Send size={13} /> Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
