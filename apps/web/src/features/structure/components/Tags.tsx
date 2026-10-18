import { sameLocationName, tidyLocationName } from "@bluprint/shared";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Tags({
	items,
	onRemove,
	removeLabel = (name) => `Tirar ${name}`,
	isNew = () => false,
}: {
	items: string[];
	onRemove?: ((index: number) => void) | undefined;
	removeLabel?: (name: string) => string;
	isNew?: (name: string) => boolean;
}) {
	if (items.length === 0) return null;
	return (
		<ul className="flex flex-wrap gap-(--space-2)">
			{items.map((name, index) => (
				<li
					key={name}
					className={cn(
						"inline-flex min-h-8 items-center gap-1 rounded-full bg-muted pl-3 text-sm",
						!onRemove && "pr-3",
						isNew(name) && "shadow-[inset_0_0_0_1px_var(--primary)]",
					)}
				>
					<span className="[overflow-wrap:anywhere]">{name}</span>
					{onRemove && (
						<button
							type="button"
							aria-label={removeLabel(name)}
							onClick={() => onRemove(index)}
							className="relative grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground outline-none after:absolute after:-inset-2 hover:text-foreground focus-visible:shadow-(--shadow-focus)"
						>
							<X className="size-4" aria-hidden="true" />
						</button>
					)}
				</li>
			))}
		</ul>
	);
}

export function AddTag({
	label,
	placeholder,
	existing,
	duplicateMessage,
	maxItems,
	maxMessage,
	onAdd,
}: {
	label: string;
	placeholder: string;
	existing: string[];
	duplicateMessage: string;
	maxItems?: number;
	maxMessage?: string;
	onAdd: (name: string) => boolean;
}) {
	const [typed, setTyped] = useState("");
	const [error, setError] = useState<string>();

	function submit(event: React.FormEvent) {
		event.preventDefault();
		const name = tidyLocationName(typed);
		if (name === "") return;
		if (existing.some((other) => sameLocationName(other, name))) {
			setError(duplicateMessage);
			return;
		}
		if (maxItems !== undefined && existing.length >= maxItems) {
			setError(maxMessage);
			return;
		}
		if (!onAdd(name)) return;
		setTyped("");
		setError(undefined);
	}

	return (
		<form onSubmit={submit} className="grid gap-(--space-1)">
			<div className="flex gap-(--space-2)">
				<Input
					aria-label={label}
					placeholder={placeholder}
					autoComplete="off"
					enterKeyHint="done"
					maxLength={60}
					aria-invalid={error !== undefined}
					value={typed}
					onChange={(event) => {
						setTyped(event.target.value);
						setError(undefined);
					}}
				/>
				<Button type="submit" variant="outline">
					Adicionar
				</Button>
			</div>
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
		</form>
	);
}
