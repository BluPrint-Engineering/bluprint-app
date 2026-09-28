import { z } from "zod";

export const projectStatuses = ["active", "delivered"] as const;

export const projectStatusSchema = z.enum(projectStatuses);

export const projectStatusFilters = [...projectStatuses, "all"] as const;

export const projectStatusFilterSchema = z.enum(projectStatusFilters);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectStatusFilter = z.infer<typeof projectStatusFilterSchema>;
