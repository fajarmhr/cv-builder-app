import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Editing requires an account. Guests are sent to login and returned afterwards.
export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return <>{children}</>;
}
