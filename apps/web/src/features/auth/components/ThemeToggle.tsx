import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({
	dark,
	onToggle,
}: {
	dark: boolean;
	onToggle: () => void;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			onClick={onToggle}
			aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
			className="text-inherit hover:bg-white/10 hover:text-inherit min-[900px]:text-muted-foreground min-[900px]:hover:bg-muted min-[900px]:hover:text-foreground"
		>
			{dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
		</Button>
	);
}
