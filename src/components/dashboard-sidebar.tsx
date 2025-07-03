"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Folder, PlusSquare, Users } from "lucide-react";

const sidebarLinks = [
  {
    name: "Projects",
    href: "/dashboard/projects",
    icon: <Folder className="w-5 h-5 mr-2" />,
  },
  {
    name: "New Project",
    href: "/dashboard/projects/new",
    icon: <PlusSquare className="w-5 h-5 mr-2" />,
  },
  {
    name: "Public Vibes",
    href: "/vibes",
    icon: <Users className="w-5 h-5 mr-2" />,
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col fixed top-0 left-0 h-screen w-60 bg-gray-900 text-white px-4 py-6 z-30">
      <div className="mb-8 text-xl font-bold tracking-tight">Dashboard</div>
      <nav className="flex-1 space-y-2">
        {sidebarLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center rounded px-3 py-2 transition-colors ${
              pathname === link.href
                ? "bg-gray-800 text-blue-400 font-semibold"
                : "hover:bg-gray-800"
            }`}
          >
            {link.icon}
            {link.name}
          </Link>
        ))}
      </nav>
      <button
        className="flex items-center mt-8 px-3 py-2 rounded bg-gray-800 hover:bg-red-600 transition-colors"
        onClick={() => signOut()}
      >
        <LogOut className="w-5 h-5 mr-2" />
        Sign Out
      </button>
    </aside>
  );
}