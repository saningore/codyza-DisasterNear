import Link from "next/link";

export default function NotFound() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-serif text-4xl font-semibold">That page is not available</h1>
      <p className="mt-3 text-lg">The address may be out of date. Check a location again for the current official records.</p>
      <Link className="mt-6 inline-flex min-h-11 items-center rounded-full bg-pine px-5 py-3 font-bold text-card" href="/">Check hazards</Link>
    </article>
  );
}
