import { notFound } from "next/navigation";
import { AdminResumePreview } from "@/components/admin/AdminResumePreview";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseResumeFromDb } from "@/lib/utils/api-helpers";

// Read-only admin view of any user's résumé, published or not. The role check
// is repeated here (not just in the layout) because this page reads résumé
// content straight from the database.
export default async function AdminResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) notFound();

  const { id } = await params;
  const dbResume = await prisma.resume.findUnique({
    where: { id },
    include: { user: { select: { id: true, username: true, fullName: true } } },
  });
  if (!dbResume) notFound();

  return (
    <AdminResumePreview
      resume={parseResumeFromDb(dbResume)}
      ownerName={dbResume.user.fullName}
      ownerUsername={dbResume.user.username}
      ownerId={dbResume.user.id}
    />
  );
}
