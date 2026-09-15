import { z } from "zod";

/** Authorization reads this set alone; see docs/adr/0024-admin-is-read-and-export-only.md. */
export const effectiveRoles = ["manager", "assistant"] as const;

export const defaultRoles = ["admin", ...effectiveRoles] as const;

export const effectiveRoleSchema = z.enum(effectiveRoles);
export const defaultRoleSchema = z.enum(defaultRoles);

export type EffectiveRole = z.infer<typeof effectiveRoleSchema>;
export type DefaultRole = z.infer<typeof defaultRoleSchema>;
