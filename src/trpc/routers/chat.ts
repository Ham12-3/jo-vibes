import { z } from "zod";
import { protectedProcedure } from "../helpers";
import { createTRPCRouter } from "../trpc";

// NOTE: Replace with your ORM or DB access logic as needed.
const db = {
  chatMessage: {
    create: async ({ data }: any) => data,
    findMany: async ({ where, orderBy }: any) => [],
  },
};

export const chatRouter = createTRPCRouter({
  addMessage: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Optionally, check if user can add message to this project.
      return await db.chatMessage.create({
        data: {
          projectId: input.projectId,
          role: input.role,
          content: input.content,
          userId: ctx.user.id,
        },
      });
    }),

  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Optionally, check project ownership.
      return await db.chatMessage.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "asc" },
      });
    }),
});