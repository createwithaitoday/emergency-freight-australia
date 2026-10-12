"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Sign-in failed.");
    else window.location.href = "/admin";
  }

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-orange">Dispatch</p>
      <h1 className="font-display text-4xl">Staff sign in</h1>
      <form onSubmit={submit} className="mt-6 grid gap-3">
        <input className="field" name="email" type="email" required aria-label="Email" placeholder="Email" />
        <input className="field" name="password" type="password" required aria-label="Password" placeholder="Password" />
        <button className="btn-navy" type="submit">Open dispatch</button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
    </main>
  );
}
