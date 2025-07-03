import { serverTRPC } from "@/src/trpc/server";
import Link from "next/link";

export default async function ProjectsPage() {
  const projects = await serverTRPC.project.getAll();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Projects</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {projects.map((p: any) => (
          <Link
            key={p.id}
            href={`/dashboard/projects/${p.id}`}
            className="block border border-gray-200 rounded-lg p-5 bg-white shadow hover:shadow-md transition"
          >
            <div className="text-lg font-medium">{p.name}</div>
            <div className="text-gray-500 text-sm mb-2">{p.description}</div>
            <div className="text-xs text-gray-400">
              Created: {new Date(p.createdAt).toLocaleString()}
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="text-gray-500">No projects yet.</div>
        )}
      </div>
    </div>
  );
}