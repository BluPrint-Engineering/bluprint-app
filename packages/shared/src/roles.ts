import { z } from "zod";

/** RF-122 authorizes on this set alone. `admin` is absent by construction,
 * which is what makes RF-116 structural instead of a guard-by-guard exception. */
export const effectiveRoles = ["manager", "assistant"] as const;

export const defaultRoles = ["admin", ...effectiveRoles] as const;

export const effectiveRoleSchema = z.enum(effectiveRoles);
export const defaultRoleSchema = z.enum(defaultRoles);

export type EffectiveRole = z.infer<typeof effectiveRoleSchema>;
export type DefaultRole = z.infer<typeof defaultRoleSchema>;
