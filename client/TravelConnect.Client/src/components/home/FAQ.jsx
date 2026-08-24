import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState(0);

  const faqs = [
    {
      question: "What is TravelConnect?",
      answer: "Travel Connect is an all-in-one boutique travel booking platform that curates premium vacation packages, luxury stays, and personalized routes. We partner with local guides and premium accommodations to provide you with seamless travel experiences.",
    },
    {
      question: "How do I book a package?",
      answer: "Booking is simple! Browse our Featured Packages, choose your destination, select your travel dates, and click 'Book Now'. Fill in your traveler information, select any custom add-ons, and proceed to our secure payment gateway to confirm your trip.",
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express), digital wallets (Apple Pay, Google Pay), and direct bank transfers. We also offer flexible installments via our 'Book Now, Pay Later' partners.",
    },
    {
      question: "Can I cancel my booking?",
      answer: "Yes, bookings can be cancelled or rescheduled. Cancellation policies vary based on the specific hotel or airline in your package. Standard bookings offer free cancellation up to 14 days before your scheduled departure.",
    },
    {
      question: "Do you offer travel insurance?",
      answer: "Absolutely. All Travel Connect packages include basic emergency health and baggage delay coverage. During checkout, you can upgrade to premium insurance which covers trip cancellation for any reason (CFAR).",
    },
    {
      question: "What documents do I need to travel?",
      answer: "You will need a valid passport (minimum 6 months validity from return date) and any required tourist visas for your destination country. Once your package is booked, we send a comprehensive document checklist tailored to your itinerary.",
    },
    {
      question: "How can I contact customer support?",
      answer: "Our global support team is available 24/7. You can reach us via our live web chat, by emailing support@travelconnect.com, or by calling our toll-free customer care line at +1 (800) 555-0199.",
    },
  ];

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section id="faqs" className="py-24 bg-white scroll-mt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#008fe5] block">Got Questions?</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-gray-500 max-w-lg mx-auto">
            Find answers to commonly asked questions about payment, itineraries, cancellations, and support.
          </p>
        </div>

        {/* Accordions Stack */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeIndex === idx;
            return (
              <div 
                key={idx}
                className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                  isOpen 
                    ? "border-blue-200 bg-blue-50/20 shadow-md" 
                    : "border-gray-150 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {/* Accordion Header Button */}
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3 pr-4">
                    <HelpCircle className={`shrink-0 ${isOpen ? "text-[#008fe5]" : "text-gray-400"}`} size={20} />
                    <span className={`text-base font-bold transition-colors ${isOpen ? "text-gray-900" : "text-gray-800"}`}>
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown 
                    size={18} 
                    className={`text-gray-500 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-[#008fe5]" : ""}`} 
                  />
                </button>

                {/* Accordion Content Panel */}
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? "max-h-60 border-t border-gray-100" : "max-h-0"
                  }`}
                >
                  <div className="p-5 sm:p-6 text-sm text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
