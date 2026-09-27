import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const DESKTOP = "(min-width: 768px)";

function subscribeToDesktop(onChange: () => void) {
	const query = window.matchMedia?.(DESKTOP);
	query?.addEventListener("change", onChange);
	return () => query?.removeEventListener("change", onChange);
}

// jsdom has no matchMedia; it renders as a phone
const isDesktop = () => window.matchMedia?.(DESKTOP).matches ?? false;

const Toaster = (props: ToasterProps) => {
	const desktop = useSyncExternalStore(subscribeToDesktop, isDesktop);
	return (
		<Sonner
			// colours come from the tokens, which follow .dark; "system" would read the OS instead of the app's theme
			theme="light"
			position={desktop ? "bottom-right" : "bottom-center"}
			duration={6000}
			closeButton
			icons={{
				success: <CircleCheck />,
				info: <Info />,
				error: <CircleAlert />,
			}}
			toastOptions={{
				unstyled: true,
				closeButtonAriaLabel: "Fechar aviso",
				classNames: {
					toast:
						"flex w-full max-w-sm items-start gap-3 rounded-lg bg-popover py-3 pr-2 pl-4 text-sm leading-normal text-popover-foreground shadow-[var(--ring-hairline),var(--shadow-lg)]",
					icon: "mt-px flex size-5 shrink-0 text-muted-foreground [&_svg]:size-5",
					error: "[&_[data-icon]]:text-destructive",
					success: "[&_[data-icon]]:text-success",
					content: "min-w-0 flex-1 py-px",
					closeButton:
						"order-last -my-2.5 -mr-0.5 grid size-(--icon-tap) shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4.5",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
