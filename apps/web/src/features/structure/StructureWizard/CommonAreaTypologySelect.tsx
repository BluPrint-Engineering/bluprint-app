import { Field, FieldLabel } from "@/components/ui/field";
import { SELECT } from "./fieldStyles";
import type { CatalogTypology } from "./typologyCatalog";

export const NEW_COMMON_AREA_TYPE = "new-common-area-type";

export function CommonAreaTypologySelect({
	id,
	label,
	value,
	options,
	onChange,
	onCreate,
	createDisabled,
}: {
	id: string;
	label: string;
	value: string | null;
	options: readonly Pick<CatalogTypology, "key" | "name">[];
	onChange: (key: string | null) => void;
	onCreate: (select: HTMLSelectElement) => void;
	createDisabled: boolean;
}) {
	const selected = options.some((option) => option.key === value) ? value : "";
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<select
				id={id}
				className={SELECT}
				value={selected ?? ""}
				onChange={(event) => {
					const next = event.target.value;
					if (next === NEW_COMMON_AREA_TYPE) {
						onCreate(event.currentTarget);
						return;
					}
					onChange(next === "" ? null : next);
				}}
			>
				<option value="">Sem tipologia</option>
				{options.map((option) => (
					<option key={option.key} value={option.key}>
						{option.name}
					</option>
				))}
				<option value={NEW_COMMON_AREA_TYPE} disabled={createDisabled}>
					Nova tipologia de área comum…
				</option>
			</select>
		</Field>
	);
}
