import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, parseResumeFromDb } from "@/lib/utils/api-helpers";
import { getCurrentAdmin } from "@/lib/auth";

// GET /api/admin/resumes/[id] — full résumé data for any user. ADMIN only.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return apiError("Forbidden", 403);

    const { id } = await params;
    const dbResume = await prisma.resume.findUnique({ where: { id } });
    if (!dbResume) return apiError("Not found", 404);

    return NextResponse.json({ resume: parseResumeFromDb(dbResume) });
  } catch (err) {
    console.error("GET /api/admin/resumes/[id] error:", err);
    return apiError("Failed to fetch resume", 500);
  }
}

// DELETE /api/admin/resumes/[id] — deletes any user's résumé. ADMIN only.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return apiError("Forbidden", 403);

    const { id } = await params;
    const resume = await prisma.resume.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!resume) return apiError("Not found", 404);

    await prisma.resume.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/resumes/[id] error:", err);
    return apiError("Failed to delete resume", 500);
  }
}
