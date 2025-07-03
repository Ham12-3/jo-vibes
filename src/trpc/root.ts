import { createTRPCRouter } from "./trpc";
import { projectRouter } from "./routers/project";
import { chatRouter } from "./routers/chat";

// Add other routers here as needed.

export const appRouter = createTRPCRouter({
  project: projectRouter,
  chat: chatRouter,
  // ...other routers
});

export type AppRouter = typeof appRouter;