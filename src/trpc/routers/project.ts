import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../helpers";
import { createTRPCRouter } from "../trpc";

// NOTE: Replace with your ORM or DB access logic as needed.
const db = {
  project: {
    findMany: async ({ where, orderBy }: any) => [],
    findUnique: async ({ where }: any) => null,
    create: async ({ data }: any) => data,
    delete: async ({ where }: any) => null,
  },
};

export const projectRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Fetch all projects for owner
    return await db.project.findMany({
      where: { ownerId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await db.project.findUnique({
        where: { id: input.id },
        include: {
          chatMessages: {
            take: 50,
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!project || project.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return {
        ...project,
        chatMessages: (project.chatMessages ?? []).slice().reverse(), // latest 50, oldest first
      };
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return await db.project.create({
        data: {
          name: input.name,
          description: input.description ?? "",
          ownerId: ctx.user.id,
          repoUrl: null,
          supabaseProjectId: null,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Optionally validate ownership before delete.
      return await db.project.delete({ where: { id: input.id } });
    }),
});