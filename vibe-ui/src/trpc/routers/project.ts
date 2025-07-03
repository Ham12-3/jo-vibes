import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "../innit";
import { db } from "@/lib/db";
import { Octokit } from "octokit";
import crypto from "crypto";

export const projectRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
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
        chatMessages: (project.chatMessages ?? []).slice().reverse(),
      };
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      let repoUrl: string | null = null;
      let supabaseProjectId: string | null = null;

      // 1. Try to create GitHub repo
      try {
        const octokit = new Octokit({
          auth: process.env.GITHUB_PAT,
        });

        // Replace spaces with dashes and lowercase for repo name
        const repoName = input.name.trim().toLowerCase().replace(/\s+/g, "-");

        const response = await octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          private: true,
          description: input.description ?? "",
        });

        repoUrl = response.data.html_url;
      } catch (err) {
        // Still proceed with null repoUrl
        repoUrl = null;
      }

      // 2. Supabase placeholder project
      supabaseProjectId = crypto.randomUUID();
      // TODO: Replace with real Supabase admin API provisioning

      // 3. Store in DB
      return await db.project.create({
        data: {
          name: input.name,
          description: input.description ?? "",
          ownerId: ctx.user.id,
          repoUrl,
          supabaseProjectId,
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