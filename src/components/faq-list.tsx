"use client";

import { useState } from "react";

export function FaqList({ items }: { items: readonly { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white">
      {items.map((item, index) => (
        <div key={item.q}>
          <button
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
            aria-expanded={open === index}
            onClick={() => setOpen(open === index ? -1 : index)}
            type="button"
          >
            {item.q}
            <span aria-hidden className="text-orange">{open === index ? "–" : "+"}</span>
          </button>
          {open === index ? <p className="px-5 pb-4 text-sm leading-6 text-muted">{item.a}</p> : null}
        </div>
      ))}
    </div>
  );
}
