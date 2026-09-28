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
	/** `sm` inline on the desktop toolbar; the default fills the width of the phone's sheet. */
	size?: "default" | "sm";
	/** Names the control for assistive tech where no visible label sits beside it. */
	"aria-label"?: string;
	"aria-labelledby"?: string;
}

/** Em andamento · Entregue · Todas: one is always chosen, so pressing the chosen one again does nothing. */
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
