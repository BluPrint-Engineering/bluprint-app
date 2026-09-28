import { MAX_PROJECT_SEARCH_LENGTH } from "@bluprint/shared";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Typing pauses this long before the address and the API hear of the search. */
const DEBOUNCE_MS = 250;

interface ProjectSearchProps {
	/** The search the address holds. */
	value: string;
	onChange: (q: string) => void;
	/** `sm` is the desktop toolbar's 36px field; `md` is the phone's 44px one. */
	size: "sm" | "md";
	className?: string;
}

/** The "Buscar obra" field: keeps what is typed itself and tells `onChange` once typing pauses, or at once on clear. */
export function ProjectSearch({
	value,
	onChange,
	size,
	className,
}: ProjectSearchProps) {
	const [text, setText] = useState(value);
	// what this field last told `onChange`: the address echoing it back must not overwrite what was typed since
	const sent = useRef(value);
	const latestOnChange = useRef(onChange);
	latestOnChange.current = onChange;

	useEffect(() => {
		if (value === sent.current) return;
		sent.current = value;
		setText(value);
	}, [value]);

	useEffect(() => {
		const q = text.trim();
		if (q === sent.current) return;
		const timer = setTimeout(() => {
			sent.current = q;
			latestOnChange.current(q);
		}, DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [text]);

	const clear = () => {
		setText("");
		sent.current = "";
		onChange("");
	};

	return (
		<div className={cn("relative", className)}>
			<Search
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 left-2.5 size-4.5 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="text"
				enterKeyHint="search"
				autoComplete="off"
				placeholder="Buscar obra"
				aria-label="Buscar obra pelo nome"
				// a longer paste would be dropped from the address, and the field would empty itself to match
				maxLength={MAX_PROJECT_SEARCH_LENGTH}
				value={text}
				onChange={(event) => setText(event.target.value)}
				className={cn(
					"pr-10 pl-9",
					size === "sm" && "h-(--control-h-sm) text-sm md:text-sm",
				)}
			/>
			{text !== "" && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Limpar busca"
					onClick={clear}
					className="absolute top-1/2 right-0.5 -translate-y-1/2"
				>
					<X aria-hidden="true" className="size-4.5" />
				</Button>
			)}
		</div>
	);
}
