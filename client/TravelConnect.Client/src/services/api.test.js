import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  supportApi,
  supportAdminApi,
  inquiriesApi,
  assetUrl,
  imgSrc,
  handleImgError,
  IMAGE_FALLBACK,
  validatePromoCode,
  fetchWithTimeout,
} from "./api";

vi.mock("./firebase", () => ({
  auth: { currentUser: null },
}));

const API_URL = "http://localhost:5110";

describe("API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("routes supportApi calls to the support endpoints", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      })
    );
    globalThis.fetch = fetcher;

    await supportApi.list();
    expect(fetcher).toHaveBeenCalledWith(
      `${API_URL}/api/support/conversations`,
      expect.objectContaining({})
    );

    await supportApi.create({ subject: "S", category: "General" });
    expect(fetcher).toHaveBeenCalledWith(
      `${API_URL}/api/support/conversations`,
      expect.objectContaining({ method: "POST" })
    );

    await supportApi.thread(3);
    expect(fetcher).toHaveBeenCalledWith(
      `${API_URL}/api/support/conversations/3`,
      expect.anything()
    );

    await supportApi.send(3, { body: "hi" });
    expect(fetcher).toHaveBeenCalledWith(
      `${API_URL}/api/support/conversations/3/messages`,
      expect.objectContaining({ method: "POST" })
    );

    await supportApi.markRead(3);
    expect(fetcher).toHaveBeenCalledWith(
      `${API_URL}/api/support/conversations/3/read`,
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("routes supportAdminApi calls including the agents roster", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      })
    );
    globalThis.fetch = fetcher;

    await supportAdminApi.inbox("?status=Open");
    expect(fetcher).toHaveBeenCalledWith(
      `${API_URL}/api/support/inbox?status=Open`,
      expect.anything()
    );

    await supportAdminApi.agents();
    expect(fetcher).toHaveBeenCalledWith(
      `${API_URL}/api/support/agents`,
      expect.anything()
    );

    await supportAdminApi.reply(3, { body: "ok" });
    expect(fetcher).toHaveBeenCalledWith(
      `${API_URL}/api/support/inbox/3/reply`,
      expect.objectContaining({ method: "POST" })
    );

    await supportAdminApi.assign(3, { assigneeEmail: "a@tc.com" });
    expect(fetcher).toHaveBeenCalledWith(
      `${API_URL}/api/support/inbox/3/assign`,
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("routes inquiriesApi CRUD", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) })
    );
    globalThis.fetch = fetcher;

    await inquiriesApi.list();
    await inquiriesApi.create({ subject: "S" });
    await inquiriesApi.remove(9);

    expect(fetcher.mock.calls[0][0]).toBe(`${API_URL}/api/inquiries`);
    expect(fetcher.mock.calls[1][0]).toBe(`${API_URL}/api/inquiries`);
    expect(fetcher.mock.calls[1][1].method).toBe("POST");
    expect(fetcher.mock.calls[2][0]).toBe(`${API_URL}/api/inquiries/9`);
    expect(fetcher.mock.calls[2][1].method).toBe("DELETE");
  });

  it("throws the backend error message on failure", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: "Conversation not found" }),
      })
    );

    await expect(supportAdminApi.thread(99)).rejects.toThrow("Conversation not found");
  });

  it("assetUrl resolves relative image paths against the API base", () => {
    expect(assetUrl("/api/images/5")).toBe(`${API_URL}/api/images/5`);
    expect(assetUrl("https://cdn.example.com/x.png")).toBe("https://cdn.example.com/x.png");
    expect(assetUrl("")).toBe("");
  });

  it("imgSrc resolves paths and falls back to the placeholder when empty", () => {
    expect(imgSrc("/api/images/5")).toBe(`${API_URL}/api/images/5`);
    expect(imgSrc("https://cdn.example.com/x.png")).toBe("https://cdn.example.com/x.png");
    expect(imgSrc("")).toBe(IMAGE_FALLBACK);
    expect(imgSrc(null)).toBe(IMAGE_FALLBACK);
    expect(imgSrc("   ")).toBe(IMAGE_FALLBACK);
  });

  it("handleImgError swaps a failed image for the placeholder exactly once", () => {
    const img = { src: "/broken.jpg", onerror: () => {} };
    handleImgError({ currentTarget: img });

    expect(img.src).toBe(IMAGE_FALLBACK);
    expect(img.onerror).toBeNull();

    const before = img.src;
    handleImgError({ currentTarget: img });
    expect(img.src).toBe(before);
  });

  it("validatePromoCode falls back to client-side rules offline", async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error("network down")));

    const good = await validatePromoCode("SUMMER26", 1000);
    expect(good.valid).toBe(true);
    expect(good.discountAmount).toBe(250);
    expect(good.finalAmount).toBe(750);

    const bad = await validatePromoCode("NOPE", 1000);
    expect(bad.valid).toBe(false);
  });

  it("validatePromoCode surfaces a server rejection instead of offline fallback", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "This promo code has expired." }),
      })
    );

    const result = await validatePromoCode("STALE", 1000);
    expect(result).toEqual({
      valid: false,
      message: "This promo code has expired.",
    });
  });

  it("validatePromoCode computes the discount from a valid server promo", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            code: "PCT25",
            campaignName: "25% Off",
            discount: 25,
            discountType: "Percent",
          }),
      })
    );

    const percent = await validatePromoCode("PCT25", 2000);
    expect(percent).toEqual({
      valid: true,
      code: "PCT25",
      description: "25% Off",
      discountAmount: 500,
      finalAmount: 1500,
    });

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            code: "FLAT300",
            campaignName: "Flat 300",
            discount: 300,
            discountType: "Flat",
          }),
      })
    );
    const flat = await validatePromoCode("FLAT300", 2000);
    expect(flat.discountAmount).toBe(300);
    expect(flat.finalAmount).toBe(1700);
  });

  it("retries a network-rejected GET once and succeeds on the second attempt", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(() => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new TypeError("Failed to fetch"))
        : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });

    const res = await fetchWithTimeout(`${API_URL}/api/test`);
    expect(res.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("retries idempotent PUT once (admin edit survives a cold-start abort)", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(() => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new TypeError("Failed to fetch"))
        : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });

    await fetchWithTimeout(`${API_URL}/api/flights/1`, { method: "PUT" });
    expect(calls).toBe(2);
  });

  it("does NOT retry POST — create stays single-shot to avoid duplicates", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(() => {
      calls += 1;
      return Promise.reject(new TypeError("Failed to fetch"));
    });

    await expect(
      fetchWithTimeout(`${API_URL}/api/flights`, { method: "POST" })
    ).rejects.toThrow("Failed to fetch");
    expect(calls).toBe(1);
  });

  it("only retries once — a second failure still rejects", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(() => {
      calls += 1;
      return Promise.reject(new TypeError("Failed to fetch"));
    });

    await expect(
      fetchWithTimeout(`${API_URL}/api/flights/1`, { method: "DELETE" })
    ).rejects.toThrow("Failed to fetch");
    expect(calls).toBe(2);
  });
});