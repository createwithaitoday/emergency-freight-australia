import { describe, expect, it } from "vitest";
import { ensureSeoInventory } from "@/lib/seo/inventory";

describe("seo inventory", () => {
  it("imports localities and builds the candidate inventory", async () => {
    const result = await ensureSeoInventory("test");
    expect(result.locationCount).toBeGreaterThan(10000);
    expect(result.candidates).toBeGreaterThanOrEqual(100000);
    expect(result.published).toBeGreaterThan(20);
    expect(result.published).toBeLessThan(2000);
    expect(result.needsImprovement).toBeGreaterThan(90000);
  }, 300000);
});
