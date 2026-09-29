import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

function ToggleGroup({
	className,
	size = "default",
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
	size?: "default" | "sm";
}) {
	return (
		<ToggleGroupPrimitive.Root
			data-slot="toggle-group"
			data-size={size}
			className={cn(
				"group/toggle-group inline-flex w-fit items-center gap-0.5 rounded-lg bg-secondary p-[3px]",
				className,
			)}
			{...props}
		/>
	);
}

function ToggleGroupItem({
	className,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
	return (
		<ToggleGroupPrimitive.Item
			data-slot="toggle-group-item"
			className={cn(
				"inline-flex h-(--control-h) shrink-0 items-center justify-center gap-2 rounded-[calc(var(--radius-lg)-3px)] px-3 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-[background-color,color] duration-(--duration-fast) ease-(--ease-standard) group-data-[size=sm]/toggle-group:h-7.5",
				"hover:text-foreground focus-visible:shadow-(--shadow-focus) disabled:pointer-events-none disabled:opacity-50",
				"data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-[var(--ring-hairline),var(--shadow-sm)] dark:data-[state=on]:bg-[color-mix(in_srgb,var(--foreground)_12%,var(--card))]",
				"[&_svg]:pointer-events-none [&_svg]:size-4.5 [&_svg]:shrink-0",
				className,
			)}
			{...props}
		/>
	);
}

export { ToggleGroup, ToggleGroupItem };
