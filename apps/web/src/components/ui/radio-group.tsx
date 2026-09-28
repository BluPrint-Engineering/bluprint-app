import { CheckIcon } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

/** The design system draws a radio list as menu rows: the label, and a check on the chosen one. */
function RadioGroup({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
	return (
		<RadioGroupPrimitive.Root
			data-slot="radio-group"
			className={cn("grid w-full", className)}
			{...props}
		/>
	);
}

function RadioGroupItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
	return (
		<RadioGroupPrimitive.Item
			data-slot="radio-group-item"
			className={cn(
				"flex min-h-(--tap-min) w-full items-center gap-(--space-3) rounded-md px-(--space-3) text-left outline-none transition-colors duration-(--duration-fast) ease-standard select-none hover:bg-muted focus-visible:bg-muted focus-visible:shadow-(--shadow-focus) disabled:pointer-events-none disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<span className="min-w-0 flex-1">{children}</span>
			<RadioGroupPrimitive.Indicator
				data-slot="radio-group-indicator"
				className="flex shrink-0"
			>
				<CheckIcon aria-hidden="true" className="size-4.5 text-primary" />
			</RadioGroupPrimitive.Indicator>
		</RadioGroupPrimitive.Item>
	);
}

export { RadioGroup, RadioGroupItem };
