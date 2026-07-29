import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export interface SessionData {
  userId?: string;
  loginTime?: number;
}

export const SESSION_COOKIE_NAME = "cv-builder-session";

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  cookieName: SESSION_COOKIE_NAME,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Returns the logged-in user's id, or null if not authenticated. */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId ?? null;
}

/** Returns the logged-in user (id, username, fullName, role), or null. */
export async function getCurrentUser() {
  const userId = await getUserId();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, fullName: true, role: true },
  });
}

/** Returns the logged-in user only if they hold the ADMIN role, else null. */
export async function getCurrentAdmin() {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? user : null;
}
