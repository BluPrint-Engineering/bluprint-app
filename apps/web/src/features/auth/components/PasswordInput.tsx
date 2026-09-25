import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** A password field with a show/hide toggle, so a thumb-typed password can be checked on a phone. */
export function PasswordInput(
	props: Omit<React.ComponentProps<typeof Input>, "type" | "className">,
) {
	const [shown, setShown] = useState(false);
	return (
		<div className="relative">
			<Input
				type={shown ? "text" : "password"}
				className="pr-(--control-h)"
				{...props}
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute inset-y-0 right-0 text-muted-foreground"
				aria-label={shown ? "Ocultar senha" : "Mostrar senha"}
				onClick={() => setShown((isShown) => !isShown)}
			>
				{shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
			</Button>
		</div>
	);
}
