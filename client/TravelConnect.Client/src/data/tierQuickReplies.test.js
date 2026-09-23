import { describe, it, expect } from "vitest";
import {
  TIER_QUICK_QUESTIONS,
  TIER_QUICK_REPLIES,
  suggestTierReply,
} from "./tierQuickReplies";

describe("tierQuickReplies data", () => {
  it("provides at least one pre-made question and reply", () => {
    expect(TIER_QUICK_QUESTIONS.length).toBeGreaterThan(0);
    expect(TIER_QUICK_REPLIES.length).toBeGreaterThan(0);
  });

  it("has unique ids across questions and replies", () => {
    const questionIds = new Set(TIER_QUICK_QUESTIONS.map((q) => q.id));
    const replyIds = new Set(TIER_QUICK_REPLIES.map((t) => t.id));
    expect(questionIds.size).toBe(TIER_QUICK_QUESTIONS.length);
    expect(replyIds.size).toBe(TIER_QUICK_REPLIES.length);
    expect(new Set([...questionIds, ...replyIds]).size).toBe(
      TIER_QUICK_QUESTIONS.length + TIER_QUICK_REPLIES.length
    );
  });

  it("shapes questions and replies correctly", () => {
    for (const q of TIER_QUICK_QUESTIONS) {
      expect(typeof q.label).toBe("string");
      expect(q.label.length).toBeGreaterThan(0);
      expect(typeof q.message).toBe("string");
      expect(q.message.length).toBeGreaterThan(0);
    }
    for (const t of TIER_QUICK_REPLIES) {
      expect(typeof t.label).toBe("string");
      expect(typeof t.reply).toBe("string");
      expect(t.reply.length).toBeGreaterThan(0);
      expect(Array.isArray(t.matches)).toBe(true);
      expect(t.matches.length).toBeGreaterThan(0);
    }
  });

  it("matches a tier question to the right canned reply", () => {
    expect(suggestTierReply("Tell me about tier 2 professional").id).toBe("r-tier2");
    expect(suggestTierReply("What does starter include?").id).toBe("r-tier1");
    expect(suggestTierReply("How do I upgrade my plan?").id).toBe("r-upgrade");
    expect(suggestTierReply("Can I pay with gcash?").id).toBe("r-pay");
  });

  it("returns null when nothing matches or text is empty", () => {
    expect(suggestTierReply("")).toBeNull();
    expect(suggestTierReply(null)).toBeNull();
    expect(suggestTierReply("How do I reset my password?")).toBeNull();
  });
});