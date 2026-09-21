import { BookIndex } from "@/components/BookIndex";
import { Hero } from "@/components/Hero";

export default function Home() {
  return (
    <>
      <Hero />
      <div className="mx-auto max-w-5xl px-6">
        <BookIndex />
      </div>
    </>
  );
}
