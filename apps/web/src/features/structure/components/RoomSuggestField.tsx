import { comparableRoomName, ROOM_NAME_MAX_LENGTH } from "@bluprint/shared";
import { Check } from "lucide-react";
import {
	type KeyboardEvent,
	type Ref,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
	type RoomSuggestionGroupId,
	SUGGESTED_ROOMS,
	spellRoom,
	suggestRooms,
} from "./roomSuggestions";

const NO_ACTIVE = -1;

export function RoomSuggestField({
	label,
	ariaLabel,
	placeholder = "Novo cômodo",
	value,
	onValueChange,
	onAdd,
	used,
	present,
	presentLabel,
	duplicateMessage,
	maxItems,
	maxMessage,
	error,
	pending = false,
	disabled = false,
	autoFocus = false,
	inputRef,
}: {
	label?: string;
	ariaLabel?: string;
	placeholder?: string;
	value: string;
	onValueChange: (value: string) => void;
	onAdd: (name: string) => void;
	used: readonly string[];
	present: readonly string[];
	presentLabel: string;
	duplicateMessage: string;
	maxItems: number;
	maxMessage: string;
	error?: string | undefined;
	pending?: boolean;
	disabled?: boolean;
	autoFocus?: boolean;
	inputRef?: Ref<HTMLInputElement>;
}) {
	const generatedId = useId();
	const fieldId = `${generatedId}-field`;
	const listId = `${generatedId}-list`;
	const errorId = `${generatedId}-error`;
	const input = useRef<HTMLInputElement | null>(null);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(NO_ACTIVE);
	const [refused, setRefused] = useState<string>();

	const setInput = useCallback(
		(node: HTMLInputElement | null) => {
			input.current = node;
			if (typeof inputRef === "function") inputRef(node);
			else if (inputRef) inputRef.current = node;
		},
		[inputRef],
	);

	const { groups, add } = suggestRooms({
		typed: value,
		suggested: SUGGESTED_ROOMS,
		used,
		present,
	});
	const choices = [
		...groups.flatMap((group) => (group.id === "present" ? [] : group.names)),
		...(add === undefined ? [] : [add]),
	];
	let next = 0;
	const numbered = groups.map((group) => ({
		...group,
		items: group.names.map((name) => ({
			name,
			index: group.id === "present" ? undefined : next++,
		})),
	}));
	const expanded = open && (groups.length > 0 || add !== undefined);
	const activeChoice = expanded ? choices[active] : undefined;
	const activeId =
		activeChoice !== undefined ? `${listId}-choice-${active}` : undefined;
	const shownError = refused ?? error;
	const busy = pending || disabled;

	useEffect(() => {
		if (activeId)
			document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
	}, [activeId]);

	function close() {
		setOpen(false);
		setActive(NO_ACTIVE);
	}

	function confirm(name: string) {
		if (busy) return;
		input.current?.focus();
		close();
		const key = comparableRoomName(name);
		if (present.some((other) => comparableRoomName(other) === key)) {
			setRefused(duplicateMessage);
			return;
		}
		if (present.length >= maxItems) {
			setRefused(maxMessage);
			return;
		}
		setRefused(undefined);
		onValueChange(name);
		onAdd(name);
	}

	function confirmTyped() {
		if (value.trim() === "") return;
		confirm(spellRoom({ typed: value, suggested: SUGGESTED_ROOMS, used }));
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.nativeEvent.isComposing) return;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			if (value.trim() === "") return;
			if (!expanded) return setOpen(true);
			setActive(Math.min(active + 1, choices.length - 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			if (expanded) setActive(Math.max(active - 1, NO_ACTIVE));
		} else if (event.key === "Escape") {
			if (!expanded) return;
			event.preventDefault();
			event.stopPropagation();
			close();
		} else if (event.key === "Enter") {
			event.preventDefault();
			if (activeChoice !== undefined) confirm(activeChoice);
			else confirmTyped();
		}
	}

	return (
		<div className="grid gap-(--space-1)">
			<Field data-invalid={shownError !== undefined}>
				{label !== undefined && (
					<FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
				)}
				<div className="flex gap-(--space-2)">
					<Input
						ref={setInput}
						id={fieldId}
						role="combobox"
						aria-label={ariaLabel}
						aria-expanded={expanded}
						aria-controls={listId}
						aria-autocomplete="list"
						aria-activedescendant={activeId}
						aria-invalid={shownError !== undefined}
						aria-describedby={shownError === undefined ? undefined : errorId}
						placeholder={placeholder}
						autoComplete="off"
						autoFocus={autoFocus}
						enterKeyHint="done"
						maxLength={ROOM_NAME_MAX_LENGTH}
						readOnly={pending}
						disabled={disabled}
						value={value}
						onChange={(event) => {
							setRefused(undefined);
							setActive(NO_ACTIVE);
							setOpen(true);
							onValueChange(event.target.value);
						}}
						onKeyDown={onKeyDown}
						onBlur={close}
					/>
					<Button
						type="button"
						variant="outline"
						disabled={busy || value.trim() === ""}
						onClick={confirmTyped}
					>
						{pending && <Spinner aria-hidden />}
						{pending ? "Adicionando…" : "Adicionar"}
					</Button>
				</div>
			</Field>
			{expanded && (
				<div
					id={listId}
					role="listbox"
					aria-label="Sugestões de cômodo"
					onMouseDown={(event) => event.preventDefault()}
					className="max-h-64 overflow-y-auto rounded-lg bg-card py-(--space-1) shadow-(--ring-hairline)"
				>
					{numbered.map((group) => (
						// biome-ignore lint/a11y/useSemanticElements: a listbox group, not a form fieldset
						<div
							key={group.id}
							role="group"
							aria-labelledby={`${listId}-${group.id}`}
						>
							<div
								id={`${listId}-${group.id}`}
								className="px-(--space-3) pt-(--space-2) pb-(--space-1) text-sm font-semibold text-muted-foreground"
							>
								{groupLabel(group.id, presentLabel)}
							</div>
							{group.items.map(({ name, index }) =>
								index === undefined ? (
									// biome-ignore lint/a11y/useFocusableInteractive: the combobox keeps focus on the input and reaches options by aria-activedescendant
									<div
										key={name}
										role="option"
										aria-selected={false}
										aria-disabled="true"
										className="flex min-h-(--tap-min) items-center gap-(--space-2) px-(--space-3) text-base text-muted-foreground [overflow-wrap:anywhere]"
									>
										<Check className="size-4.5 shrink-0" aria-hidden="true" />
										{name}
									</div>
								) : (
									<SuggestionOption
										key={name}
										id={`${listId}-choice-${index}`}
										name={name}
										selected={index === active}
										onChoose={() => confirm(name)}
									/>
								),
							)}
						</div>
					))}
					{add !== undefined && (
						<div
							className={
								groups.length > 0
									? "mt-(--space-1) border-t border-border pt-(--space-1)"
									: ""
							}
						>
							<SuggestionOption
								id={`${listId}-choice-${choices.length - 1}`}
								name={`Adicionar “${add}”`}
								selected={choices.length - 1 === active}
								onChoose={() => confirm(add)}
							/>
						</div>
					)}
				</div>
			)}
			{shownError !== undefined && (
				<p id={errorId} role="alert" className="text-sm text-destructive">
					{shownError}
				</p>
			)}
		</div>
	);
}

function groupLabel(id: RoomSuggestionGroupId, presentLabel: string) {
	if (id === "suggested") return "Sugestões";
	if (id === "used") return "Usados nesta obra";
	return presentLabel;
}

function SuggestionOption({
	id,
	name,
	selected,
	onChoose,
}: {
	id: string;
	name: string;
	selected: boolean;
	onChoose: () => void;
}) {
	return (
		// biome-ignore lint/a11y/useFocusableInteractive: the combobox keeps focus on the input and reaches options by aria-activedescendant
		// biome-ignore lint/a11y/useKeyWithClickEvents: the keys are handled by the input that owns the listbox
		<div
			id={id}
			role="option"
			aria-selected={selected}
			onClick={onChoose}
			className="flex min-h-(--tap-min) cursor-pointer items-center px-(--space-3) text-base [overflow-wrap:anywhere] aria-selected:bg-accent aria-selected:font-medium"
		>
			{name}
		</div>
	);
}
