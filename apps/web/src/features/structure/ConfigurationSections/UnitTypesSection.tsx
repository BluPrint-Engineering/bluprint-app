import type { ProjectSummary, UnitType } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LockNote } from "@/components/LockNote";
import { Button } from "@/components/ui/button";
import { firstLoadState } from "@/lib/firstLoadState";
import {
	isUnitTypeInUse,
	unitTypesQueryOptions,
	useDeleteUnitTypeMutation,
} from "../api";
import { STRUCTURE_LOCKED } from "../lockedText";
import { SectionCard, SectionNote } from "./SectionCard";
import { SectionFailure, SectionSkeleton } from "./SectionLoad";
import { UNIT_TYPES_SECTION_ID } from "./sectionIds";
import { UnitTypeEditor } from "./UnitTypeEditor";
import {
	type NameDialogTarget,
	UnitTypeNameDialog,
} from "./UnitTypeNameDialog";
import { UnitTypeRow } from "./UnitTypeRow";

const LEAD =
	"Cada unidade acompanha a sua tipologia; o que for mudado numa unidade continua só nela.";
const EMPTY =
	"Nenhuma tipologia. Elas nascem no assistente, junto com a estrutura, ou aqui.";

export function UnitTypesSection({ project }: { project: ProjectSummary }) {
	const query = useQuery(unitTypesQueryOptions(project.id));
	const remove = useDeleteUnitTypeMutation(project.id);
	const [editingId, setEditingId] = useState<string>();
	const [naming, setNaming] = useState<NameDialogTarget>();
	const editable = project.status === "active";

	function deleteUnitType({ id, name }: UnitType) {
		remove.mutate(id, {
			onSuccess: () => toast.success(`${name} excluída.`),
			onError: (failure) =>
				toast.error(
					isUnitTypeInUse(failure)
						? `Não foi possível excluir a ${name}: unidades passaram a usá-la.`
						: `Não foi possível excluir a ${name}. Confira sua conexão e tente de novo.`,
				),
		});
	}

	const state = query.data ? undefined : firstLoadState(query);
	const unitTypes = query.data?.unitTypes ?? [];

	return (
		<SectionCard id={UNIT_TYPES_SECTION_ID} title="Tipologias">
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
					<SectionNote>{unitTypes.length > 0 ? LEAD : EMPTY}</SectionNote>
					<ul className="-mx-(--card-spacing) border-t border-border">
						{unitTypes.map((unitType) => (
							<li
								key={unitType.id}
								className="border-t border-border first:border-t-0"
							>
								{editable && editingId === unitType.id ? (
									<UnitTypeEditor
										projectId={project.id}
										unitType={unitType}
										onClose={() => setEditingId(undefined)}
									/>
								) : (
									<UnitTypeRow
										unitType={unitType}
										editable={editable}
										onEditRooms={() => setEditingId(unitType.id)}
										onRename={() => setNaming({ mode: "rename", unitType })}
										onDelete={() => deleteUnitType(unitType)}
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
				<UnitTypeNameDialog
					key={naming.mode === "rename" ? naming.unitType.id : "create"}
					projectId={project.id}
					target={naming}
					onClose={() => setNaming(undefined)}
					onCreated={(created) => setEditingId(created.id)}
				/>
			)}
		</SectionCard>
	);
}
