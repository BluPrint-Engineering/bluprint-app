import type { CreateDiscipline, Discipline } from "@bluprint/shared";
import { toast } from "sonner";
import { isProjectDelivered } from "../../projects/api";
import {
	disciplineNameTakenOf,
	isDisciplineLimitReached,
	useCreateDisciplineMutation,
} from "../api";
import type { NewDisciplineRefusal } from "./NewDisciplineDialog";

export function useCreateDiscipline(
	projectId: string,
	{
		onCreated,
		onDelivered,
	}: { onCreated: (created: Discipline) => void; onDelivered: () => void },
) {
	const create = useCreateDisciplineMutation(projectId);

	return async function send(
		discipline: CreateDiscipline,
	): Promise<NewDisciplineRefusal | undefined> {
		try {
			const created = await create.mutateAsync(discipline);
			toast.success(`Disciplina ${created.name} criada.`);
			onCreated(created);
			return undefined;
		} catch (failure) {
			const takenAs = disciplineNameTakenOf(failure);
			if (takenAs !== undefined) return { nameTakenAs: takenAs };
			if (isDisciplineLimitReached(failure)) return { limitReached: true };
			if (isProjectDelivered(failure)) {
				onDelivered();
				return undefined;
			}
			throw failure;
		}
	};
}
