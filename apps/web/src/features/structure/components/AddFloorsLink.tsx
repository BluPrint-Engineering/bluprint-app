import type { StructureTower } from "@bluprint/shared";
import { Link } from "@tanstack/react-router";
import { ListPlus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const NO_FLOORS_DESCRIPTION =
	"Adicione os andares e as unidades de uma vez, com a numeração pronta.";

export function AddFloorsLink({
	projectId,
	towerId,
	...props
}: { projectId: string; towerId: string } & Omit<
	ComponentProps<typeof Link>,
	"to" | "params" | "search"
>) {
	return (
		<Link
			to="/projects/$projectId/structure/new"
			params={{ projectId }}
			search={{ tower: towerId }}
			{...props}
		/>
	);
}

function TowerItems({
	projectId,
	towers,
}: {
	projectId: string;
	towers: StructureTower[];
}) {
	return towers.map((tower) => (
		<DropdownMenuItem key={tower.id} asChild>
			<AddFloorsLink projectId={projectId} towerId={tower.id}>
				<ListPlus className="size-4.5" aria-hidden="true" />
				Adicionar andares à {tower.name}
			</AddFloorsLink>
		</DropdownMenuItem>
	));
}

export function AssistantMenuItem({
	projectId,
	towers,
}: {
	projectId: string;
	towers: StructureTower[];
}): ReactNode {
	const [only, ...others] = towers;
	if (!only) return null;
	if (others.length === 0) {
		return (
			<DropdownMenuItem asChild>
				<AddFloorsLink projectId={projectId} towerId={only.id}>
					<ListPlus className="size-4.5" aria-hidden="true" />
					Montar com o assistente
				</AddFloorsLink>
			</DropdownMenuItem>
		);
	}
	return (
		<DropdownMenuGroup>
			<DropdownMenuLabel>Montar com o assistente</DropdownMenuLabel>
			<TowerItems projectId={projectId} towers={towers} />
		</DropdownMenuGroup>
	);
}

export function AssistantButton({
	projectId,
	towers,
}: {
	projectId: string;
	towers: StructureTower[];
}): ReactNode {
	const [only, ...others] = towers;
	if (!only) return null;
	if (others.length === 0) {
		return (
			<Button asChild variant="ghost" className="max-md:flex-1">
				<AddFloorsLink projectId={projectId} towerId={only.id}>
					<ListPlus className="size-4.5" aria-hidden="true" />
					Assistente
				</AddFloorsLink>
			</Button>
		);
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="max-md:flex-1">
					<ListPlus className="size-4.5" aria-hidden="true" />
					Assistente
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<TowerItems projectId={projectId} towers={towers} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
