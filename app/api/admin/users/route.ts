import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils/api-helpers";
import { getCurrentAdmin } from "@/lib/auth";

// GET /api/admin/users — every user with their résumé count. ADMIN only.
export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return apiError("Forbidden", 403);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { resumes: true } },
      },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        resumeCount: u._count.resumes,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return apiError("Failed to fetch users", 500);
  }
}
