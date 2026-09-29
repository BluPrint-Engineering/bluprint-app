import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			data-slot="pagination"
			className={cn("flex justify-center", className)}
			{...props}
		/>
	);
}

function PaginationContent({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="pagination-content"
			className={cn("flex items-center gap-(--space-1)", className)}
			{...props}
		/>
	);
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
	isActive?: boolean;
} & React.ComponentProps<"button">;

function PaginationLink({
	className,
	isActive,
	...props
}: PaginationLinkProps) {
	return (
		<Button
			type="button"
			variant={isActive ? "outline" : "ghost"}
			size="sm"
			aria-current={isActive ? "page" : undefined}
			data-slot="pagination-link"
			data-active={isActive}
			className={cn(
				"min-w-(--control-h-sm) px-(--space-2) text-sm tabular-nums aria-busy:opacity-100 aria-[current=page]:border-input aria-[current=page]:disabled:opacity-100",
				className,
			)}
			{...props}
		/>
	);
}

function PaginationPrevious({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink className={cn("px-(--space-3)", className)} {...props}>
			<ChevronLeftIcon className="size-4" aria-hidden="true" />
			Anterior
		</PaginationLink>
	);
}

function PaginationNext({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink className={cn("px-(--space-3)", className)} {...props}>
			Próxima
			<ChevronRightIcon className="size-4" aria-hidden="true" />
		</PaginationLink>
	);
}

function PaginationEllipsis({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			aria-hidden="true"
			data-slot="pagination-ellipsis"
			className={cn(
				"flex min-w-(--control-h-sm) justify-center text-sm text-muted-foreground",
				className,
			)}
			{...props}
		>
			…
		</span>
	);
}

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
