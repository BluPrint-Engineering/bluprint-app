import { Search, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TypologySearch({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const field = useRef<HTMLInputElement>(null);

	return (
		<div className="relative">
			<Search
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 left-2.5 size-4.5 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				ref={field}
				type="text"
				enterKeyHint="search"
				autoComplete="off"
				placeholder="Buscar tipologia"
				aria-label="Buscar tipologia"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="pr-11 pl-9"
			/>
			{value !== "" && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label="Limpar busca"
					onClick={() => {
						onChange("");
						field.current?.focus();
					}}
					className="absolute top-1/2 right-0 -translate-y-1/2"
				>
					<X aria-hidden="true" className="size-4.5" />
				</Button>
			)}
		</div>
	);
}
