"use client";
import { useState, useRef } from "react";
import { trpc } from "@/src/trpc/client";
import { Loader2 } from "lucide-react";

type ChatMessage = {
  id: string;
  projectId: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

interface Props {
  projectId: string;
  initialMessages: ChatMessage[];
}

export default function ChatBuilder({ projectId, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isAssistantTyping, setAssistantTyping] = useState(false);

  const addMessage = trpc.chat.addMessage.useMutation();
  const ref = useRef<HTMLFormElement>(null);

  const handleUserMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      projectId,
      role: "user",
      content: input,
    };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    addMessage.mutate({ projectId, role: "user", content: input });
    setAssistantTyping(true);

    // POST to OpenAI stream endpoint
    const res = await fetch("/api/openai", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          ...messages.map(({ content, role }) => ({ role, content })),
          { role: "user", content: input },
        ],
      }),
    });
    if (!res.body) return setAssistantTyping(false);

    // Stream response
    const reader = res.body.getReader();
    let assistantContent = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantContent += new TextDecoder().decode(value);
      setMessages((msgs) => [
        ...msgs.filter((m) => m.role !== "assistant" || m.id !== "typing"),
        ...(!assistantContent
          ? []
          : [
              {
                id: "typing",
                projectId,
                role: "assistant",
                content: assistantContent,
              } as ChatMessage,
            ]),
      ]);
    }
    setAssistantTyping(false);
    setMessages((msgs) =>
      [
        ...msgs.filter((m) => m.id !== "typing"),
        {
          id: crypto.randomUUID(),
          projectId,
          role: "assistant",
          content: assistantContent,
        },
      ]
    );
    addMessage.mutate({
      projectId,
      role: "assistant",
      content: assistantContent,
    });
    ref.current?.reset();
  };

  return (
    <div className="max-w-xl">
      <div className="mb-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded ${
              m.role === "assistant"
                ? "bg-blue-50 text-blue-900"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            <div className="text-xs mb-1 font-mono opacity-50">{m.role}</div>
            <div>{m.content}</div>
          </div>
        ))}
        {isAssistantTyping && (
          <div className="p-3 rounded bg-blue-50 text-blue-900 flex items-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Assistant is typing...</span>
          </div>
        )}
      </div>
      <form
        onSubmit={handleUserMessage}
        className="flex items-center gap-2"
        ref={ref}
      >
        <input
          className="flex-1 border border-gray-300 rounded px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          required
          disabled={isAssistantTyping}
        />
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          type="submit"
          disabled={isAssistantTyping || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}