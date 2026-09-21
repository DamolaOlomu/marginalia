import { BookIndex } from "@/components/BookIndex";
import { Hero } from "@/components/Hero";
import { ThisWeek } from "@/components/ThisWeek";

export default function Home() {
  return (
    <>
      <Hero />
      <div className="mx-auto max-w-5xl px-6">
        <ThisWeek />
        <BookIndex />
      </div>
    </>
  );
}
