import type { ProjectStatusFilter } from "@bluprint/shared";
import {
	projectStatusFilterSchema,
	projectStatusFilters,
} from "@bluprint/shared";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { STATUS_FILTER_LABELS } from "./statusLabels";

interface StatusFilterProps {
	value: ProjectStatusFilter;
	onChange: (status: ProjectStatusFilter) => void;
	size?: "default" | "sm";
	"aria-label"?: string;
	"aria-labelledby"?: string;
}

export function StatusFilter({
	value,
	onChange,
	size = "default",
	...labelling
}: StatusFilterProps) {
	return (
		<ToggleGroup
			type="single"
			size={size}
			value={value}
			onValueChange={(next) => {
				// a single toggle group reports "" when the pressed item is pressed again
				if (next) onChange(projectStatusFilterSchema.parse(next));
			}}
			className={cn(size === "default" && "w-full")}
			{...labelling}
		>
			{projectStatusFilters.map((status) => (
				<ToggleGroupItem
					key={status}
					value={status}
					className={cn(size === "default" && "flex-1")}
				>
					{STATUS_FILTER_LABELS[status]}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
