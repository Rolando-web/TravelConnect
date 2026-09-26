import { describe, it, expect } from "vitest";
import {
  onlyDigits,
  sanitizePhMobile,
  formatPhMobile,
  formatPhMobileFull,
  isValidPhMobile,
} from "./phone";

describe("phone utils", () => {
  describe("onlyDigits", () => {
    it("strips everything except digits", () => {
      expect(onlyDigits("+63 917-123-4567")).toBe("639171234567");
      expect(onlyDigits("abc123")).toBe("123");
      expect(onlyDigits("")).toBe("");
      expect(onlyDigits(null)).toBe("");
    });
  });

  describe("sanitizePhMobile", () => {
    it("keeps a plain 10-digit local number", () => {
      expect(sanitizePhMobile("9171234567")).toBe("9171234567");
    });
    it("drops the leading 0 of a local number", () => {
      expect(sanitizePhMobile("09171234567")).toBe("9171234567");
    });
    it("drops the +63 country code", () => {
      expect(sanitizePhMobile("+639171234567")).toBe("9171234567");
      expect(sanitizePhMobile("639171234567")).toBe("9171234567");
    });
    it("handles partial +63 input while typing", () => {
      expect(sanitizePhMobile("+63 917")).toBe("917");
      expect(sanitizePhMobile("+63 9")).toBe("9");
      expect(sanitizePhMobile("63")).toBe("63");
    });
    it("caps at 10 digits", () => {
      expect(sanitizePhMobile("9171234567890")).toBe("9171234567");
    });
    it("strips spaces and dashes", () => {
      expect(sanitizePhMobile("+63 917-123-4567")).toBe("9171234567");
    });
  });

  describe("formatPhMobile", () => {
    it("formats 10 digits as 9XX-XXX-XXXX", () => {
      expect(formatPhMobile("9171234567")).toBe("917-123-4567");
    });
    it("formats partial numbers progressively", () => {
      expect(formatPhMobile("91")).toBe("91");
      expect(formatPhMobile("9171")).toBe("917-1");
      expect(formatPhMobile("9171234")).toBe("917-123-4");
    });
  });

  describe("formatPhMobileFull", () => {
    it("prefixes with +63", () => {
      expect(formatPhMobileFull("9171234567")).toBe("+63 917-123-4567");
    });
    it("returns empty for empty input", () => {
      expect(formatPhMobileFull("")).toBe("");
    });
  });

  describe("isValidPhMobile", () => {
    it("accepts a valid 10-digit number starting with 9", () => {
      expect(isValidPhMobile("9171234567")).toBe(true);
    });
    it("rejects numbers not starting with 9", () => {
      expect(isValidPhMobile("8171234567")).toBe(false);
    });
    it("rejects short or long numbers", () => {
      expect(isValidPhMobile("917123456")).toBe(false);
      expect(isValidPhMobile("91712345678")).toBe(false);
    });
    it("rejects non-numeric input", () => {
      expect(isValidPhMobile("9ab1234567")).toBe(false);
    });
  });
});