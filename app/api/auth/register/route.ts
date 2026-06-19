import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password, fullName } = await req.json();

    if (!username || !password || !fullName) {
      return NextResponse.json(
        { error: "Username, password, and full name are required" },
        { status: 400 }
      );
    }

    const normalizedUsername = String(username).trim().toLowerCase();

    if (normalizedUsername.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }
    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        passwordHash,
        fullName: String(fullName).trim(),
      },
      select: { id: true },
    });

    const session = await getSession();
    session.userId = user.id;
    session.loginTime = Date.now();
    await session.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
