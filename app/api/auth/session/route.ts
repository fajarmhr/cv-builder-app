import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    return NextResponse.json({
      isLoggedIn: session.isLoggedIn === true,
    });
  } catch {
    return NextResponse.json({ isLoggedIn: false });
  }
}
