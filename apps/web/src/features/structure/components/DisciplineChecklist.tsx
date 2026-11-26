import { Plus } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { GENERAL_NOTE } from "../disciplinesText";
import { CheckRow } from "./CheckRow";
import { DISCIPLINE_LIMIT_TEXT } from "./NewDisciplineDialog";

export interface ChecklistDiscipline {
	id: string;
	name: string;
}

export function DisciplineChecklist({
	label,
	disciplines,
	checked,
	onToggle,
	atLimit,
	onNew,
	newRef,
	disabled = false,
}: {
	label: string;
	disciplines: readonly ChecklistDiscipline[];
	checked: ReadonlySet<string>;
	onToggle: (disciplineId: string, next: boolean) => void;
	atLimit: boolean;
	onNew: () => void;
	newRef?: Ref<HTMLButtonElement>;
	disabled?: boolean;
}) {
	return (
		<div className="grid gap-(--space-3)">
			<ul
				aria-label={label}
				className="overflow-hidden rounded-xl bg-card shadow-(--ring-hairline)"
			>
				{disciplines.map((discipline) => (
					<CheckRow
						key={discipline.id}
						checked={checked.has(discipline.id)}
						disabled={disabled}
						onCheckedChange={(next) => onToggle(discipline.id, next)}
					>
						{discipline.name}
					</CheckRow>
				))}
			</ul>
			{atLimit ? (
				<p className="text-sm text-pretty text-muted-foreground">
					{DISCIPLINE_LIMIT_TEXT}
				</p>
			) : (
				<Button
					ref={newRef}
					type="button"
					variant="ghost"
					size="lg"
					disabled={disabled}
					className="text-primary max-md:w-full md:justify-self-start"
					onClick={onNew}
				>
					<Plus aria-hidden="true" />
					Nova disciplina
				</Button>
			)}
			<p className="text-sm text-pretty text-muted-foreground">
				{GENERAL_NOTE}
			</p>
		</div>
	);
}
