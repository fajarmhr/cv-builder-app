import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils/api-helpers";
import { getCurrentAdmin } from "@/lib/auth";

// GET /api/admin/users/[id] — one user plus a summary of their résumés.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return apiError("Forbidden", 403);

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        resumes: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            templateId: true,
            personalInfo: true,
            isPublished: true,
            shareToken: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!user) return apiError("Not found", 404);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      resumes: user.resumes.map((r) => {
        let personName: string | null = null;
        if (r.personalInfo) {
          try {
            personName = JSON.parse(r.personalInfo).name || null;
          } catch {
            // malformed JSON — the UI falls back to the résumé title
          }
        }
        return {
          id: r.id,
          title: r.title,
          templateId: r.templateId,
          personName,
          isPublished: r.isPublished,
          shareToken: r.shareToken,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        };
      }),
    });
  } catch (err) {
    console.error("GET /api/admin/users/[id] error:", err);
    return apiError("Failed to fetch user", 500);
  }
}

// DELETE /api/admin/users/[id] — removes the user and cascades their résumés.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return apiError("Forbidden", 403);

    const { id } = await params;
    if (id === admin.id) {
      return apiError("You cannot delete your own admin account", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) return apiError("Not found", 404);

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/users/[id] error:", err);
    return apiError("Failed to delete user", 500);
  }
}
