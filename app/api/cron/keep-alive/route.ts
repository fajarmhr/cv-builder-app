import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Daily ping so Supabase doesn't pause the project after 7 days of inactivity.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.count();
    return NextResponse.json({ ok: true, users, at: new Date().toISOString() });
  } catch (error) {
    console.error("keep-alive ping failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
