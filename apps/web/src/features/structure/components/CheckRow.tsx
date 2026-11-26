import { type ReactNode, useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function CheckRow({
	checked,
	onCheckedChange,
	disabled = false,
	children,
}: {
	checked: boolean;
	onCheckedChange: (next: boolean) => void;
	disabled?: boolean;
	children: ReactNode;
}) {
	const boxId = useId();
	const nameId = useId();

	return (
		<li className="border-t border-border first:border-t-0">
			<label
				htmlFor={boxId}
				className={cn(
					"flex min-h-14 items-center gap-(--space-3) px-(--space-4) py-(--space-2)",
					disabled ? "cursor-not-allowed" : "cursor-pointer",
				)}
			>
				<Checkbox
					id={boxId}
					checked={checked}
					disabled={disabled}
					aria-labelledby={nameId}
					onCheckedChange={(next) => onCheckedChange(next === true)}
				/>
				<span
					id={nameId}
					className="min-w-0 text-base font-medium [overflow-wrap:anywhere]"
				>
					{children}
				</span>
			</label>
		</li>
	);
}
