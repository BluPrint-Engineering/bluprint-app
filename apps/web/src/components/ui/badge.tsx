import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-(--space-2) text-xs leading-none font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
	{
		variants: {
			variant: {
				primary: "bg-accent text-accent-foreground",
				neutral: "bg-secondary text-secondary-foreground",
				destructive: "bg-destructive/10 text-destructive",
				outline: "border-border text-muted-foreground",
				count:
					"h-5 min-w-5 px-1.5 bg-primary font-semibold text-primary-foreground tabular-nums",
			},
		},
		defaultVariants: {
			variant: "primary",
		},
	},
);

function Badge({
	className,
	variant = "primary",
	asChild = false,
	...props
}: React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : "span";

	return (
		<Comp
			data-slot="badge"
			data-variant={variant}
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
