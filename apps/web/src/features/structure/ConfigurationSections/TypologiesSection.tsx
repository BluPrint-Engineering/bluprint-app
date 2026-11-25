import type {
	ProjectSummary,
	Typology,
	TypologyLocationType,
} from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LockNote } from "@/components/LockNote";
import { Button } from "@/components/ui/button";
import { useClearSessionDraft, useSessionDraft } from "@/features/auth";
import { firstLoadState } from "@/lib/firstLoadState";
import { matchesSearch } from "@/utils/matchesSearch";
import {
	isTypologyInUse,
	typologiesQueryOptions,
	useCopyTypologyMutation,
	useDeleteTypologyMutation,
} from "../api";
import { CopyTypologyDialog } from "../components/CopyTypologyDialog";
import { plural } from "../plural";
import {
	type CopyTarget,
	copyRequest,
	copyTargetOf,
	keptCopyTarget,
} from "./copyTarget";
import { SectionCard, SectionNote } from "./SectionCard";
import { SectionFailure, SectionSkeleton } from "./SectionLoad";
import { TYPOLOGIES_SECTION_ID } from "./sectionIds";
import { TypologyEditor } from "./TypologyEditor";
import {
	type NameDialogTarget,
	TypologyNameDialog,
} from "./TypologyNameDialog";
import { TypologyRow } from "./TypologyRow";
import { TypologySearch } from "./TypologySearch";
import { deleteInUseText } from "./typologySaveText";

const LEAD =
	"Cada unidade e cada área comum acompanha a sua tipologia. O que for mudado num local continua só nele.";
const EMPTY =
	"Nenhuma tipologia. Elas nascem no assistente, junto com a estrutura, ou aqui.";
const LOCKED =
	"A obra foi entregue: as tipologias não podem mais ser alteradas.";
const SEARCH_FROM = 7;

const GROUPS = [
	{
		locationType: "unit",
		title: "Unidades",
		empty: "Nenhuma tipologia de unidade.",
		create: "Nova tipologia",
	},
	{
		locationType: "common_area",
		title: "Áreas comuns",
		empty: "Nenhuma tipologia de área comum.",
		create: "Nova tipologia de área comum",
	},
] as const satisfies readonly {
	locationType: TypologyLocationType;
	title: string;
	empty: string;
	create: string;
}[];

function isLocationType(value: unknown): value is TypologyLocationType {
	return value === "unit" || value === "common_area";
}

function createdDraft(
	variables: unknown,
): { locationType: TypologyLocationType } | undefined {
	if (typeof variables !== "object" || variables === null) return undefined;
	if (!("name" in variables) || typeof variables.name !== "string") {
		return undefined;
	}
	return "locationType" in variables && isLocationType(variables.locationType)
		? { locationType: variables.locationType }
		: undefined;
}

function updatedDraft(
	variables: unknown,
): { typologyId: string; rooms: boolean } | undefined {
	if (typeof variables !== "object" || variables === null) return undefined;
	if (
		!("typologyId" in variables) ||
		typeof variables.typologyId !== "string"
	) {
		return undefined;
	}
	return {
		typologyId: variables.typologyId,
		rooms: "rooms" in variables && Array.isArray(variables.rooms),
	};
}

export function TypologiesSection({ project }: { project: ProjectSummary }) {
	const query = useQuery(typologiesQueryOptions(project.id));
	const remove = useDeleteTypologyMutation(project.id);
	const created = useSessionDraft("create-typology", createdDraft);
	const updated = useSessionDraft("update-typology", updatedDraft);
	const keptCopy = useSessionDraft("copy-typology", keptCopyTarget);
	const copy = useCopyTypologyMutation(project.id);
	const clearCopyDraft = useClearSessionDraft("copy-typology");
	const [editingId, setEditingId] = useState<string>();
	const [naming, setNaming] = useState<NameDialogTarget | undefined>(
		created
			? { mode: "create", locationType: created.locationType }
			: undefined,
	);
	const [copying, setCopying] = useState<CopyTarget | undefined>(keptCopy);
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
	const [search, setSearch] = useState("");
	const restoredUpdate = useRef(false);
	const createButtons = useRef(
		new Map<TypologyLocationType, HTMLButtonElement>(),
	);
	const triggers = useRef(new Map<string, HTMLButtonElement>());
	const rows = useRef(new Map<string, HTMLButtonElement>());
	const copiedId = useRef<string>(undefined);
	const newRoomField = useRef<HTMLInputElement>(null);
	const createdNow = useRef(false);
	const closedEditor = useRef<string>(undefined);
	useEffect(() => {
		if (editingId !== undefined || closedEditor.current === undefined) return;
		triggers.current.get(closedEditor.current)?.focus();
		closedEditor.current = undefined;
	}, [editingId]);
	useEffect(() => {
		if (restoredUpdate.current || !updated || !query.data) return;
		const typology = query.data.typologies.find(
			(item) => item.id === updated.typologyId,
		);
		if (!typology) return;
		restoredUpdate.current = true;
		if (updated.rooms) setEditingId(typology.id);
		else setNaming({ mode: "rename", typology });
	}, [query.data, updated]);
	const editable = project.status === "active";

	function deleteTypology(typology: Typology) {
		remove.mutate(typology.id, {
			onSuccess: () => toast.success(`${typology.name} excluída.`),
			onError: (failure) =>
				toast.error(
					isTypologyInUse(failure)
						? deleteInUseText(typology)
						: `Não foi possível excluir a ${typology.name}. Confira sua conexão e tente de novo.`,
				),
		});
	}

	function closeCopy() {
		clearCopyDraft();
		setCopying(undefined);
	}

	async function confirmCopy(target: CopyTarget, name: string) {
		const created = await copy.mutateAsync(copyRequest(target, name));
		copiedId.current = created.id;
		setSearch("");
		setExpanded((current) => new Set(current).add(created.id));
		toast.success(
			`${created.name} criada com ${plural(created.rooms.length, "cômodo", "cômodos")}.`,
		);
		closeCopy();
	}

	function toggle(id: string) {
		setExpanded((current) => {
			const next = new Set(current);
			if (!next.delete(id)) next.add(id);
			return next;
		});
	}

	const state = query.data ? undefined : firstLoadState(query);
	const typologies = query.data?.typologies ?? [];
	const searchable = typologies.length >= SEARCH_FROM;
	if (!searchable && search !== "") setSearch("");
	const searching = searchable && search.trim() !== "";
	const editing =
		editable && typologies.some(({ id }) => id === editingId)
			? editingId
			: undefined;

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
					{searchable && <TypologySearch value={search} onChange={setSearch} />}
					{GROUPS.map((group) => {
						const all = typologies.filter(
							(typology) => typology.locationType === group.locationType,
						);
						const shown = searching
							? all.filter(
									(typology) =>
										typology.id === editing ||
										matchesSearch(typology.name, search),
								)
							: all;
						const createOff = editing !== undefined;
						return (
							<section
								key={group.locationType}
								aria-labelledby={`${TYPOLOGIES_SECTION_ID}-${group.locationType}`}
								className="-mx-(--card-spacing) grid"
							>
								<div className="flex items-baseline justify-between gap-(--space-2) px-(--space-4) pb-(--space-2)">
									<h4
										id={`${TYPOLOGIES_SECTION_ID}-${group.locationType}`}
										className="text-base font-semibold"
									>
										{group.title}
									</h4>
									<span className="text-sm text-muted-foreground">
										{plural(all.length, "tipologia", "tipologias")}
									</span>
								</div>
								<ul className="border-t border-border">
									{shown.map((typology) => (
										<li
											key={typology.id}
											className="border-t border-border first:border-t-0"
										>
											{typology.id === editing ? (
												<TypologyEditor
													projectId={project.id}
													typology={typology}
													fieldRef={newRoomField}
													onClose={() => {
														closedEditor.current = typology.id;
														setEditingId(undefined);
													}}
												/>
											) : (
												<TypologyRow
													typology={typology}
													expanded={expanded.has(typology.id)}
													onToggle={() => toggle(typology.id)}
													toggleRef={(toggleButton) => {
														if (toggleButton) {
															rows.current.set(typology.id, toggleButton);
														} else rows.current.delete(typology.id);
													}}
													{...(editable && {
														actions: {
															editRoomsDisabled: editing !== undefined,
															onEditRooms: () => setEditingId(typology.id),
															onCopy: () => setCopying(copyTargetOf(typology)),
															onRename: () =>
																setNaming({ mode: "rename", typology }),
															onDelete: () => deleteTypology(typology),
															triggerRef: (trigger) => {
																if (trigger) {
																	triggers.current.set(typology.id, trigger);
																} else triggers.current.delete(typology.id);
															},
														},
													})}
												/>
											)}
										</li>
									))}
									{shown.length === 0 && (
										<li className="px-(--space-4) py-(--space-3) text-sm text-muted-foreground">
											{searching
												? "Nenhuma tipologia com esse nome."
												: group.empty}
										</li>
									)}
									{editable && !searching && (
										<li className="border-t border-border py-(--space-1) pl-(--space-2)">
											<Button
												type="button"
												variant="ghost"
												ref={(button) => {
													if (button) {
														createButtons.current.set(
															group.locationType,
															button,
														);
													} else
														createButtons.current.delete(group.locationType);
												}}
												aria-disabled={createOff || undefined}
												className="text-primary aria-disabled:pointer-events-none aria-disabled:opacity-50"
												onClick={() => {
													if (createOff) return;
													setNaming({
														mode: "create",
														locationType: group.locationType,
													});
												}}
											>
												<Plus aria-hidden="true" />
												{group.create}
											</Button>
										</li>
									)}
								</ul>
							</section>
						);
					})}
					{!editable && <LockNote>{LOCKED}</LockNote>}
				</>
			)}
			{copying && editable && (
				<CopyTypologyDialog
					key={copying.id}
					name={copying.original.name}
					rooms={copying.rooms}
					takenNames={typologies.map(({ name }) => name)}
					{...(copying.name !== undefined && { initialName: copying.name })}
					onConfirm={(name) => confirmCopy(copying, name)}
					onClose={closeCopy}
					returnFocus={() => {
						if (copiedId.current !== undefined) {
							const row = rows.current.get(copiedId.current);
							copiedId.current = undefined;
							return row;
						}
						return triggers.current.get(copying.original.id);
					}}
				/>
			)}
			{naming && (
				<TypologyNameDialog
					key={
						naming.mode === "rename" ? naming.typology.id : naming.locationType
					}
					projectId={project.id}
					target={naming}
					typologies={typologies}
					onClose={() => setNaming(undefined)}
					onCreated={(typology) => {
						createdNow.current = true;
						setEditingId(typology.id);
					}}
					returnFocus={() => {
						if (createdNow.current) {
							createdNow.current = false;
							return newRoomField.current;
						}
						return naming.mode === "rename"
							? triggers.current.get(naming.typology.id)
							: createButtons.current.get(naming.locationType);
					}}
				/>
			)}
		</SectionCard>
	);
}
