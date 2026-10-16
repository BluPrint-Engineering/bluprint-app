import { createLink } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const BackAnchor = React.forwardRef<
	HTMLAnchorElement,
	React.ComponentPropsWithoutRef<"a">
>(function BackAnchor({ children, className, ...props }, ref) {
	return (
		<a
			ref={ref}
			className={cn(
				"-ml-1.5 flex min-h-(--tap-min) w-fit items-center gap-0.5 rounded-md pr-(--space-2) text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:shadow-(--shadow-focus) focus-visible:outline-none",
				className,
			)}
			{...props}
		>
			<ChevronLeft className="size-5" aria-hidden="true" />
			{children}
		</a>
	);
});

export const BackLink = createLink(BackAnchor);

export function PageBand({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-border">
			<div className="mx-auto grid max-w-(--content-max-wide) gap-(--space-2) px-(--page-pad) pt-1 pb-(--space-5) md:px-(--page-pad-desktop) md:pt-(--space-4) md:pb-(--space-6)">
				{children}
			</div>
		</div>
	);
}

export function PageMain({ children }: { children: React.ReactNode }) {
	return (
		<main className="mx-auto w-full max-w-(--content-max-wide) flex-1 px-(--page-pad) pt-(--space-5) pb-(--space-8) md:px-(--page-pad-desktop) md:pt-(--space-8) md:pb-(--space-12)">
			{children}
		</main>
	);
}
