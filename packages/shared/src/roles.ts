import { z } from "zod";

/** Authorization reads this set alone. `admin` is absent by construction, which
 * keeps the admin read-and-export only structurally instead of by an exception
 * in each guard (docs/adr/0024-admin-is-read-and-export-only.md). */
export const effectiveRoles = ["manager", "assistant"] as const;

export const defaultRoles = ["admin", ...effectiveRoles] as const;

export const effectiveRoleSchema = z.enum(effectiveRoles);
export const defaultRoleSchema = z.enum(defaultRoles);

export type EffectiveRole = z.infer<typeof effectiveRoleSchema>;
export type DefaultRole = z.infer<typeof defaultRoleSchema>;
