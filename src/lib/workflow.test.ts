import { describe, expect, it } from "vitest";
import {
  canTransition,
  customerMayCancel,
  initialStatus,
  templatesForTransition,
} from "@/lib/workflow";

describe("booking workflow", () => {
  it("files an unconfirmed quote for price review", () => {
    expect(initialStatus(false)).toBe("new_request");
    expect(initialStatus(true)).toBe("awaiting_payment");
  });

  it("refuses to mark a job delivered before it is in transit", () => {
    expect(canTransition("confirmed", "delivered")).toBe(false);
    expect(canTransition("driver_allocated", "delivered")).toBe(false);
    expect(canTransition("in_transit", "delivered")).toBe(true);
  });

  it("does not send a driver-allocated message before that status", () => {
    expect(templatesForTransition("awaiting_payment", "new_request", "unpaid")).not.toContain("driver_allocated");
    expect(templatesForTransition("driver_allocated", "confirmed", "paid")).toEqual(["driver_allocated"]);
    expect(templatesForTransition("delivered", "in_transit", "paid")).toEqual(["delivered"]);
  });

  it("sends the new-request templates only when the booking is created", () => {
    expect(templatesForTransition("new_request", null, "unpaid")).toEqual([
      "customer_request_received",
      "staff_new_request",
    ]);
  });

  it("lets a customer cancel only before dispatch", () => {
    expect(customerMayCancel("awaiting_payment")).toBe(true);
    expect(customerMayCancel("driver_allocated")).toBe(false);
    expect(customerMayCancel("in_transit")).toBe(false);
  });

  it("does not jump an unpaid request straight to confirmed", () => {
    expect(canTransition("new_request", "confirmed")).toBe(false);
    expect(canTransition("awaiting_payment", "confirmed")).toBe(true);
  });
});
