import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-24">
      <h1 className="font-display text-4xl">That page is not on this site.</h1>
      <Link href="/" className="mt-4 inline-block font-semibold underline">Back to the start</Link>
    </main>
  );
}
