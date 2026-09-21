import { NextResponse } from "next/server";
import { bollsTranslations } from "@/lib/providers/bolls";
import { getbibleTranslations } from "@/lib/providers/getbible";

export const revalidate = 86400;

export async function GET() {
  const [bolls, getbible] = await Promise.allSettled([bollsTranslations(), getbibleTranslations()]);
  const translations = [
    ...(bolls.status === "fulfilled" ? bolls.value : []),
    ...(getbible.status === "fulfilled" ? getbible.value : []),
  ];

  if (translations.length === 0) {
    return NextResponse.json({ error: "No Bible provider could be reached." }, { status: 502 });
  }

  return NextResponse.json({
    translations,
    providers: { bolls: bolls.status === "fulfilled", getbible: getbible.status === "fulfilled" },
  });
}
