import { notFound } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";

// Every /admin/* route is gated here: non-admins get a 404 rather than a
// redirect, so the panel's existence isn't advertised to regular users.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) notFound();

  return <>{children}</>;
}
