import { useState } from "react";
import { cn } from "@/lib/utils";
import { SECTIONS } from "./sections";

export function SectionNav() {
	const [current, setCurrent] = useState<string>(SECTIONS[0].id);

	return (
		<nav
			aria-label="Seções da configuração"
			className="sticky top-22 grid gap-0.5"
		>
			{SECTIONS.map(({ id, label, Icon }) => (
				<a
					key={id}
					href={`#${id}`}
					aria-current={current === id ? "true" : undefined}
					className={cn(
						"flex min-h-(--tap-min) items-center gap-(--space-3) rounded-lg px-(--space-3) text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:shadow-(--shadow-focus) focus-visible:outline-none",
						current === id && "bg-accent text-accent-foreground",
					)}
					onClick={(event) => {
						event.preventDefault();
						setCurrent(id);
						document.getElementById(id)?.scrollIntoView({ block: "start" });
					}}
				>
					<Icon className="size-4.5" aria-hidden />
					{label}
				</a>
			))}
		</nav>
	);
}
