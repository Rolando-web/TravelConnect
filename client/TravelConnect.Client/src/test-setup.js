import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrollIntoView; the chat widget calls it when
// new messages arrive. Provide a no-op so component effects don't crash.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}