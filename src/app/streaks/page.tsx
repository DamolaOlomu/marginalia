import type { Metadata } from "next";
import { Streaks } from "@/components/Streaks";

export const metadata: Metadata = { title: "Streaks" };

export default function StreaksPage() {
  return <Streaks />;
}
