import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils/api-helpers";
import { getUserId } from "@/lib/auth";

// GET /api/resumes/[id]/share — current share state
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return apiError("Unauthorized", 401);

  const { id } = await params;
  const resume = await prisma.resume.findFirst({
    where: { id, userId },
    select: { shareToken: true, isPublished: true },
  });
  if (!resume) return apiError("Resume not found", 404);

  return NextResponse.json({
    isPublished: resume.isPublished,
    shareToken: resume.isPublished ? resume.shareToken : null,
  });
}

// POST /api/resumes/[id]/share — enable sharing (creates a stable token once)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return apiError("Unauthorized", 401);

  const { id } = await params;
  const resume = await prisma.resume.findFirst({
    where: { id, userId },
    select: { shareToken: true },
  });
  if (!resume) return apiError("Resume not found", 404);

  const updated = await prisma.resume.update({
    where: { id },
    data: {
      isPublished: true,
      // Keep the existing token stable; only generate one if absent.
      shareToken: resume.shareToken ?? createId(),
    },
    select: { shareToken: true, isPublished: true },
  });

  return NextResponse.json({
    isPublished: updated.isPublished,
    shareToken: updated.shareToken,
  });
}

// DELETE /api/resumes/[id]/share — disable sharing (token is retained for re-enable)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) return apiError("Unauthorized", 401);

  const { id } = await params;
  const resume = await prisma.resume.findFirst({ where: { id, userId }, select: { id: true } });
  if (!resume) return apiError("Resume not found", 404);

  await prisma.resume.update({
    where: { id },
    data: { isPublished: false },
  });

  return NextResponse.json({ isPublished: false, shareToken: null });
}
