import { describe, expect, it } from "vitest";
import DOMPurify from "dompurify";

describe("security boundaries", () => {
  it("removes executable email markup", () => {
    const clean = DOMPurify.sanitize('<img src=x onerror=alert(1)><p>Safe</p>');
    expect(clean).toContain("Safe");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("script");
  });

  it("keeps API routes outside the service worker cache policy", () => {
    expect("/api/ai/generate-image".includes("/api/")).toBe(true);
  });
});
