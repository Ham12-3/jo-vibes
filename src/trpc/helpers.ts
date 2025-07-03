import { TRPCError, initTRPC } from "@trpc/server";

const t = initTRPC.context().create();

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});