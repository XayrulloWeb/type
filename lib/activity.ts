import "server-only";
import type { Prisma } from "@prisma/client";

export function adminActivity(
  actor: { id: string; username: string },
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    description: string;
    metadata?: Prisma.InputJsonValue;
  },
): Prisma.AdminActivityUncheckedCreateInput {
  return {
    actorId: actor.id,
    actorUsername: actor.username,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    description: input.description,
    metadata: input.metadata,
  };
}
