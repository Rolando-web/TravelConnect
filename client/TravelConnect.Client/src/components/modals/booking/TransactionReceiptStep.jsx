import { CheckCircle } from "lucide-react";

export default function TransactionReceiptStep({ completedBooking, guestName }) {
  if (!completedBooking) return null;

  return (
    <div className="space-y-6 text-center animate-fadeIn py-4">
      <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-lg shadow-green-200">
        <CheckCircle size={36} />
      </div>

      <div>
        <h3 className="text-2xl font-black text-gray-900">Payment Transaction Confirmed!</h3>
        <p className="text-xs text-gray-500 mt-1">
          Transaction Reference: <span className="font-mono font-bold text-gray-900">{completedBooking.id || completedBooking.referenceNumber}</span>
        </p>
      </div>

      <div className="bg-slate-50 border border-gray-200 rounded-2xl p-5 text-left text-xs space-y-3 max-w-lg mx-auto">
        <div className="flex justify-between border-b border-gray-200 pb-2">
          <span className="text-gray-400 font-medium">Payment Status:</span>
          <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">PAID</span>
        </div>
        <div className="flex justify-between border-b border-gray-200 pb-2">
          <span className="text-gray-400 font-medium">Transaction ID:</span>
          <span className="font-mono font-bold text-gray-800">{completedBooking.transactionId}</span>
        </div>
        <div className="flex justify-between border-b border-gray-200 pb-2">
          <span className="text-gray-400 font-medium">Package Name:</span>
          <span className="font-bold text-gray-900">{completedBooking.name || completedBooking.packageName}</span>
        </div>
        <div className="flex justify-between border-b border-gray-200 pb-2">
          <span className="text-gray-400 font-medium">Total Paid Amount:</span>
          <span className="font-bold text-gray-900 text-sm">₱{(completedBooking.totalAmount || completedBooking.amount || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 font-medium">Traveler:</span>
          <span className="font-bold text-gray-800">{completedBooking.customerName || guestName}</span>
        </div>
      </div>
    </div>
  );
}
