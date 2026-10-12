"use client";

import { brand } from "@/lib/brand";
import { track } from "@/components/analytics";

export function PhoneLink({ className, label }: { className?: string; label?: string }) {
  return (
    <a
      className={className}
      href={`tel:${brand.phoneTel}`}
      onClick={() => track("phone_call")}
    >
      {label ?? brand.phoneDisplay}
    </a>
  );
}
