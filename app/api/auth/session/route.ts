import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      isLoggedIn: !!user,
      user: user ?? null,
    });
  } catch {
    return NextResponse.json({ isLoggedIn: false, user: null });
  }
}
