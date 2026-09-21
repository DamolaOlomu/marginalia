import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-serif text-4xl">That passage doesn't exist</h1>
      <p className="mt-4 text-muted">Check the book and chapter, or pick one from the book list.</p>
      <Link href="/" className="btn btn-gilt mt-8">
        Browse books
      </Link>
    </div>
  );
}
