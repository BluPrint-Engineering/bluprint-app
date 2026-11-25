import { DISCIPLINE_NAME_MAX_LENGTH, sameRoomName } from "@bluprint/shared";
import { Info, Plus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { uuidV7 } from "@/lib/uuidV7";
import { FormDialog } from "./FormDialog";

export interface NewDiscipline {
	id: string;
	name: string;
	appliesEverywhere: boolean;
}

export type NewDisciplineRefusal =
	| { nameTakenAs: string }
	| { limitReached: true };

export const DISCIPLINE_LIMIT_TEXT =
	"Esta obra já tem 10 disciplinas extras, o máximo.";

const GENERAL = "Geral";

const SCOPES = [
	{
		value: "everywhere",
		label: "Na obra toda",
		description: "Ligada em unidades e áreas comuns, inclusive nas novas.",
	},
	{
		value: "where-on",
		label: "Só onde for ligada",
		description: "Desligada até você ligar em cada local ou em lote.",
	},
] as const;

type Scope = (typeof SCOPES)[number]["value"];

const takenText = (name: string) => `${name} já existe nesta obra.`;

function nameError(
	name: string,
	existingNames: readonly string[],
): string | undefined {
	if (name === "") return "Informe o nome.";
	if (name.length > DISCIPLINE_NAME_MAX_LENGTH) {
		return `Use até ${DISCIPLINE_NAME_MAX_LENGTH} caracteres.`;
	}
	if (sameRoomName(name, GENERAL)) {
		return "Geral vale em todo local e não entra na lista.";
	}
	const existing = existingNames.find((each) => sameRoomName(each, name));
	return existing === undefined ? undefined : takenText(existing);
}

export function NewDisciplineDialog({
	existingNames,
	initial,
	onCreate,
	onClose,
	returnFocus,
}: {
	existingNames: readonly string[];
	initial?: NewDiscipline | undefined;
	onCreate: (
		discipline: NewDiscipline,
	) => Promise<NewDisciplineRefusal | undefined>;
	onClose: () => void;
	returnFocus: () => HTMLElement | null | undefined;
}) {
	const formId = useId();
	const legendId = useId();
	const [id] = useState(() => initial?.id ?? uuidV7());
	const [name, setName] = useState(initial?.name ?? "");
	const [scope, setScope] = useState<Scope | undefined>(
		initial && (initial.appliesEverywhere ? "everywhere" : "where-on"),
	);
	const [error, setError] = useState<string>();
	const [limitReached, setLimitReached] = useState(false);
	const [failed, setFailed] = useState(false);
	const [pending, setPending] = useState(false);
	const sending = useRef(false);

	async function submit() {
		if (sending.current || scope === undefined) return;
		const trimmed = name.trim();
		const invalid = nameError(trimmed, existingNames);
		if (invalid) return setError(invalid);

		sending.current = true;
		setPending(true);
		setFailed(false);
		try {
			const refusal = await onCreate({
				id,
				name: trimmed,
				appliesEverywhere: scope === "everywhere",
			});
			if (refusal && "nameTakenAs" in refusal) {
				setError(takenText(refusal.nameTakenAs));
			} else if (refusal) {
				setLimitReached(true);
			}
		} catch {
			setFailed(true);
		} finally {
			sending.current = false;
			setPending(false);
		}
	}

	return (
		<FormDialog
			title="Nova disciplina"
			submitLabel="Criar"
			SubmitIcon={Plus}
			pendingLabel="Criando…"
			pending={pending}
			submitDisabled={scope === undefined || limitReached}
			formId={formId}
			onSubmit={() => void submit()}
			onClose={onClose}
			returnFocus={returnFocus}
		>
			{failed && (
				<Alert variant="destructive">
					<AlertDescription>
						Não foi possível criar a disciplina. Confira a conexão e tente de
						novo.
					</AlertDescription>
				</Alert>
			)}
			{limitReached && (
				<Alert>
					<Info aria-hidden="true" />
					<AlertDescription>{DISCIPLINE_LIMIT_TEXT}</AlertDescription>
				</Alert>
			)}
			<Field data-invalid={!!error}>
				<FieldLabel htmlFor={`${formId}-name`}>Nome</FieldLabel>
				<Input
					id={`${formId}-name`}
					autoFocus
					autoComplete="off"
					enterKeyHint="done"
					maxLength={DISCIPLINE_NAME_MAX_LENGTH + 20}
					value={name}
					disabled={pending}
					aria-invalid={!!error}
					aria-describedby={`${formId}-name-hint`}
					onChange={(event) => {
						setError(undefined);
						setName(event.target.value);
					}}
				/>
				{error ? (
					<FieldError id={`${formId}-name-hint`}>{error}</FieldError>
				) : (
					<FieldDescription id={`${formId}-name-hint`}>
						Ex.: Pintura, Gesso, Impermeabilização.
					</FieldDescription>
				)}
			</Field>
			<div className="grid gap-(--space-2)">
				<span id={legendId} className="text-sm font-medium">
					Onde se aplica
				</span>
				<RadioGroup
					aria-labelledby={legendId}
					aria-required="true"
					className="gap-(--space-2)"
					value={scope ?? ""}
					disabled={pending}
					onValueChange={(next) => {
						if (next === "everywhere" || next === "where-on") setScope(next);
					}}
				>
					{SCOPES.map((option) => (
						<RadioGroupItem
							key={option.value}
							value={option.value}
							aria-labelledby={`${formId}-${option.value}`}
							aria-describedby={`${formId}-${option.value}-description`}
							className="items-start rounded-lg border border-border bg-card py-(--space-3) hover:bg-muted data-[state=checked]:border-primary data-[state=checked]:bg-accent"
						>
							<span className="grid gap-(--space-1)">
								<span
									id={`${formId}-${option.value}`}
									className="text-base font-medium"
								>
									{option.label}
								</span>
								<span
									id={`${formId}-${option.value}-description`}
									className="text-sm text-muted-foreground"
								>
									{option.description}
								</span>
							</span>
						</RadioGroupItem>
					))}
				</RadioGroup>
			</div>
			<p className="text-sm text-pretty text-muted-foreground">
				Essa escolha não muda depois. Andares e torres começam só com Hidráulica
				e Elétrica.
			</p>
			<p className="text-sm text-pretty text-muted-foreground">
				Cor e planta própria se ajustam na configuração da obra, em Disciplinas.
			</p>
		</FormDialog>
	);
}
