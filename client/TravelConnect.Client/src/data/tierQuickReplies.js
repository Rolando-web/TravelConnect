// Pre-made content for tier (subscription) inquiries.
//
//   • TIER_QUICK_QUESTIONS — quick-question chips shown in the customer chat
//     when a Subscription conversation is open, so a customer can ask about
//     any tier without typing.
//   • TIER_QUICK_REPLIES — canned reply templates the Super Admin can insert
//     in the Support Hub tier tab with one click. `matches` lets the admin pin
//     the best template to the latest customer message (see suggestTierReply).
//
// Prices/decriptions mirror the seeded SubscriptionPlan data
// (DatabaseInitializer: Starter ₱2,999 / Professional ₱7,999 / Enterprise ₱14,999).

export const TIER_QUICK_QUESTIONS = [
  {
    id: "q-tier1",
    label: "Tier 1 Starter details",
    message:
      "What is included in the Tier 1 Starter plan and how much does it cost per month?",
  },
  {
    id: "q-tier2",
    label: "Tier 2 Professional details",
    message:
      "What is included in the Tier 2 Professional plan and how much does it cost per month?",
  },
  {
    id: "q-tier3",
    label: "Tier 3 Enterprise details",
    message:
      "What is included in the Tier 3 Enterprise plan and how much does it cost per month?",
  },
  {
    id: "q-upgrade",
    label: "How do I upgrade?",
    message: "How do I upgrade to a higher tier subscription?",
  },
  {
    id: "q-switch",
    label: "Can I switch tiers?",
    message: "Can I switch to a different tier anytime, and can I downgrade?",
  },
  {
    id: "q-pay",
    label: "How do I pay?",
    message: "What payment options do you accept for the subscription?",
  },
];

export const TIER_QUICK_REPLIES = [
  {
    id: "r-tier1",
    label: "Tier 1 Starter",
    matches: ["tier 1", "tier one", "starter", "plano 1"],
    reply:
      "Tier 1 (Starter) is ₱2,999/month and is built for solo travel consultants and small agencies: core booking management, a basic catalog, and workspaces for up to 2 users. Would you like me to help you get started?",
  },
  {
    id: "r-tier2",
    label: "Tier 2 Professional",
    matches: ["tier 2", "tier two", "professional", "plano 2"],
    reply:
      "Tier 2 (Professional) is ₱7,999/month for established agencies: full inventory management (flights, hotels, cars, activities, destinations), CRM basics, promotions, and payment visibility — for up to 10 users.",
  },
  {
    id: "r-tier3",
    label: "Tier 3 Enterprise",
    matches: ["tier 3", "tier three", "enterprise", "plano 3"],
    reply:
      "Tier 3 (Enterprise) is ₱14,999/month and unlocks the full platform: team and user management, supplier partnerships, leads/CRM pipeline, payments, reports, and advanced analytics — for up to 25 users.",
  },
  {
    id: "r-upgrade",
    label: "Upgrading",
    matches: ["upgrade", "higher tier", "move up", "advance"],
    reply:
      "You can upgrade at any time from the Admin → Subscriptions area. The new tier takes effect immediately and we prorate the remaining days of your current billing cycle.",
  },
  {
    id: "r-switch",
    label: "Switching / downgrade",
    matches: ["switch", "change tier", "downgrade", "different tier"],
    reply:
      "Yes, you may switch tiers anytime. Upgrades apply right away; downgrades take effect at the end of your current billing cycle so you keep full access until then.",
  },
  {
    id: "r-pay",
    label: "Payment options",
    matches: ["payment", "pay", "gcash", "card", "credit", "debit"],
    reply:
      "Subscriptions are paid through PayMongo — we accept Visa and Mastercard (card payments complete instantly) as well as GCash. Let me know if you run into any issue with a payment.",
  },
];

// Pick the best canned reply for a customer message, or null if nothing matches.
export function suggestTierReply(customerText = "") {
  const text = String(customerText || "").toLowerCase();
  if (!text.trim()) return null;
  for (const t of TIER_QUICK_REPLIES) {
    if (t.matches.some((m) => text.includes(m))) return t;
  }
  return null;
}