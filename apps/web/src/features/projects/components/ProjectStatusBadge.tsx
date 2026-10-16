import type { ProjectStatus } from "@bluprint/shared";
import { CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "./statusLabels";

const STATUS_BADGE_VARIANT = {
	active: "primary",
	delivered: "success",
} as const satisfies Record<ProjectStatus, "primary" | "success">;

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
	return (
		<Badge variant={STATUS_BADGE_VARIANT[status]}>
			{status === "delivered" ? (
				<CircleCheck aria-hidden="true" />
			) : (
				<span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
			)}
			{STATUS_LABELS[status]}
		</Badge>
	);
}
