import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/options"; // Adjust path as needed
import DashboardSidebar from "@/src/components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <section className="flex-1 p-6">{children}</section>
    </div>
  );
}