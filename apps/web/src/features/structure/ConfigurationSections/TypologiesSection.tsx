import type { ProjectSummary, Typology } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LockNote } from "@/components/LockNote";
import { Button } from "@/components/ui/button";
import { useSessionDraft } from "@/features/auth";
import { firstLoadState } from "@/lib/firstLoadState";
import {
	isTypologyInUse,
	typologiesQueryOptions,
	useDeleteTypologyMutation,
} from "../api";
import { STRUCTURE_LOCKED } from "../lockedText";
import { SectionCard, SectionNote } from "./SectionCard";
import { SectionFailure, SectionSkeleton } from "./SectionLoad";
import { TYPOLOGIES_SECTION_ID } from "./sectionIds";
import { TypologyEditor } from "./TypologyEditor";
import {
	type NameDialogTarget,
	TypologyNameDialog,
} from "./TypologyNameDialog";
import { TypologyRow } from "./TypologyRow";

function typologyDraft(
	variables: unknown,
	mode: "create" | "update",
): { typologyId?: string; rooms?: true } | undefined {
	if (typeof variables !== "object" || variables === null) return undefined;
	if (mode === "create") {
		return "name" in variables && typeof variables.name === "string"
			? {}
			: undefined;
	}
	if (
		!("typologyId" in variables) ||
		typeof variables.typologyId !== "string"
	) {
		return undefined;
	}
	const rooms =
		"rooms" in variables &&
		Array.isArray(variables.rooms) &&
		variables.rooms.length > 0;
	return rooms
		? { typologyId: variables.typologyId, rooms: true }
		: { typologyId: variables.typologyId };
}

const LEAD =
	"Cada unidade acompanha a sua tipologia; o que for mudado numa unidade continua só nela.";
const EMPTY =
	"Nenhuma tipologia. Elas nascem no assistente, junto com a estrutura, ou aqui.";

export function TypologiesSection({ project }: { project: ProjectSummary }) {
	const query = useQuery(typologiesQueryOptions(project.id));
	const remove = useDeleteTypologyMutation(project.id);
	const created = useSessionDraft("create-typology", (variables) =>
		typologyDraft(variables, "create"),
	);
	const updated = useSessionDraft("update-typology", (variables) =>
		typologyDraft(variables, "update"),
	);
	const [editingId, setEditingId] = useState<string>();
	const [naming, setNaming] = useState<NameDialogTarget | undefined>(
		created ? { mode: "create" } : undefined,
	);
	const opened = useRef(false);
	useEffect(() => {
		if (opened.current || !updated || !query.data) return;
		const typology = query.data.typologies.find(
			(item) => item.id === updated.typologyId,
		);
		if (!typology) return;
		opened.current = true;
		if (updated.rooms) setEditingId(typology.id);
		else setNaming({ mode: "rename", typology });
	}, [query.data, updated]);
	const editable = project.status === "active";

	function deleteTypology({ id, name }: Typology) {
		remove.mutate(id, {
			onSuccess: () => toast.success(`${name} excluída.`),
			onError: (failure) =>
				toast.error(
					isTypologyInUse(failure)
						? `Não foi possível excluir a ${name}: unidades passaram a usá-la.`
						: `Não foi possível excluir a ${name}. Confira sua conexão e tente de novo.`,
				),
		});
	}

	const state = query.data ? undefined : firstLoadState(query);
	const typologies = query.data?.typologies ?? [];

	return (
		<SectionCard id={TYPOLOGIES_SECTION_ID} title="Tipologias">
			{state === "loading" && <SectionSkeleton label="Carregando tipologias" />}
			{(state === "failed" || state === "offline") && (
				<SectionFailure
					state={state}
					what="as tipologias"
					onRetry={() => query.refetch()}
				/>
			)}
			{query.data && (
				<>
					<SectionNote>{typologies.length > 0 ? LEAD : EMPTY}</SectionNote>
					<ul className="-mx-(--card-spacing) border-t border-border">
						{typologies.map((typology) => (
							<li
								key={typology.id}
								className="border-t border-border first:border-t-0"
							>
								{editable && editingId === typology.id ? (
									<TypologyEditor
										projectId={project.id}
										typology={typology}
										onClose={() => setEditingId(undefined)}
									/>
								) : (
									<TypologyRow
										typology={typology}
										editable={editable}
										onEditRooms={() => setEditingId(typology.id)}
										onRename={() => setNaming({ mode: "rename", typology })}
										onDelete={() => deleteTypology(typology)}
									/>
								)}
							</li>
						))}
						{editable && (
							<li className="border-t border-border py-(--space-1) pl-(--space-2)">
								<Button
									type="button"
									variant="ghost"
									className="text-primary"
									onClick={() => setNaming({ mode: "create" })}
								>
									<Plus aria-hidden="true" />
									Nova tipologia
								</Button>
							</li>
						)}
					</ul>
					{!editable && <LockNote>{STRUCTURE_LOCKED}</LockNote>}
				</>
			)}
			{naming && (
				<TypologyNameDialog
					key={naming.mode === "rename" ? naming.typology.id : "create"}
					projectId={project.id}
					target={naming}
					onClose={() => setNaming(undefined)}
					onCreated={(created) => setEditingId(created.id)}
				/>
			)}
		</SectionCard>
	);
}
