import { serverTRPC } from "@/src/trpc/server";
import ChatBuilder from "@/src/components/chat-builder";

interface ProjectPageProps {
  params: { id: string };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const data = await serverTRPC.project.getById({ id: params.id });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{data.name}</h1>
      <p className="mb-4 text-gray-600">{data.description}</p>
      <ChatBuilder
        projectId={data.id}
        initialMessages={data.chatMessages || []}
      />
    </div>
  );
}