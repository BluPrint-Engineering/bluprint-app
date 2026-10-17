import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { organizationUnitsQueryOptions } from "../../account/api";
import { plural } from "../components/plural";
import { useBottomBarHeight } from "./useBottomBarHeight";

export type NewProjectPlacement = "title" | "bar" | "empty";

function UnitsLink({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<Link
			to="/units"
			className={cn(
				"-my-3.25 inline-block rounded-sm py-3.25 text-primary underline-offset-3 hover:underline focus-visible:shadow-(--shadow-focus) focus-visible:outline-none",
				className,
			)}
		>
			{children}
		</Link>
	);
}

function UnitsLine() {
	const units = useQuery(organizationUnitsQueryOptions);
	if (units.isPending) {
		return <Skeleton aria-hidden className="inline-block h-4 w-32" />;
	}
	if (!units.data) return null;
	const { free, reclaimable } = units.data;
	if (free > 0) {
		return (
			<UnitsLink className="font-medium tabular-nums">
				{free.toLocaleString("pt-BR")}{" "}
				{plural(free, "unidade livre", "unidades livres")}
			</UnitsLink>
		);
	}
	return (
		<span className="text-balance text-muted-foreground">
			{reclaimable > 0 ? (
				<>
					Nenhuma unidade livre.{" "}
					<UnitsLink className="font-medium">
						Baixe a reserva de uma obra
					</UnitsLink>{" "}
					ou fale com a BluPrint.
				</>
			) : (
				"Nenhuma unidade livre. Fale com a BluPrint."
			)}
		</span>
	);
}

function NewProjectButton({
	size,
	className,
}: {
	size: "default" | "lg";
	className?: string;
}) {
	const units = useQuery(organizationUnitsQueryOptions);
	if (units.data?.free === 0) {
		return (
			<Button size={size} className={className} disabled>
				<Plus className="size-5" aria-hidden />
				Nova obra
			</Button>
		);
	}
	return (
		<Button asChild size={size} className={className}>
			<Link to="/projects/new">
				<Plus className="size-5" aria-hidden />
				Nova obra
			</Link>
		</Button>
	);
}

function BottomBar() {
	const bar = useRef<HTMLDivElement>(null);
	useBottomBarHeight(bar);
	return (
		<div
			ref={bar}
			className="fixed inset-x-0 bottom-0 z-20 grid gap-(--space-3) border-t bg-background px-(--page-pad) pt-(--space-3) pb-[calc(var(--space-3)+env(safe-area-inset-bottom))]"
		>
			<div className="text-center text-sm leading-normal">
				<UnitsLine />
			</div>
			<NewProjectButton size="lg" className="w-full" />
		</div>
	);
}

export function NewProjectAction({
	placement,
}: {
	placement: NewProjectPlacement;
}) {
	if (placement === "bar") return <BottomBar />;
	if (placement === "empty") {
		return (
			<div className="grid w-full justify-items-center gap-(--space-3)">
				<NewProjectButton size="lg" className="max-md:w-full" />
				<div className="text-sm leading-normal">
					<UnitsLine />
				</div>
			</div>
		);
	}
	return (
		<div className="ml-auto flex items-center gap-(--space-4) self-center">
			<div className="text-sm leading-normal">
				<UnitsLine />
			</div>
			<NewProjectButton size="default" />
		</div>
	);
}
