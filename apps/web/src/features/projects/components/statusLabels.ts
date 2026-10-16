import type { ProjectStatus, ProjectStatusFilter } from "@bluprint/shared";

export const STATUS_LABELS: Record<ProjectStatus, string> = {
	active: "Em andamento",
	delivered: "Entregue",
};

export const STATUS_FILTER_LABELS: Record<ProjectStatusFilter, string> = {
	...STATUS_LABELS,
	all: "Todas",
};
