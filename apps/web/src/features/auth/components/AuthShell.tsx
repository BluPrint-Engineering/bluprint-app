import type * as React from "react";
import { Logo } from "@/components/brand/Logo";
import { useTheme } from "../useTheme";
import { ThemeToggle } from "./ThemeToggle";

/** Flat form on mobile, framed card from 900px — applied on the Card the caller renders inside AuthShell. */
export const authCardClassName =
	"gap-(--space-5) rounded-none bg-transparent py-0 ring-0 " +
	"[&_[data-slot=card-header]]:px-0 [&_[data-slot=card-content]]:px-0 " +
	"[&_[data-slot=card-footer]]:justify-center [&_[data-slot=card-footer]]:border-0 [&_[data-slot=card-footer]]:bg-transparent [&_[data-slot=card-footer]]:p-(--space-2) " +
	"min-[900px]:rounded-xl min-[900px]:bg-card min-[900px]:py-(--card-spacing) min-[900px]:ring-1 min-[900px]:ring-foreground/10 " +
	"min-[900px]:[&_[data-slot=card-header]]:px-(--card-spacing) min-[900px]:[&_[data-slot=card-content]]:px-(--card-spacing) " +
	"min-[900px]:[&_[data-slot=card-footer]]:border-t min-[900px]:[&_[data-slot=card-footer]]:bg-muted/50 min-[900px]:[&_[data-slot=card-footer]]:p-(--card-spacing)";

export function AuthShell({ children }: { children: React.ReactNode }) {
	const { dark, toggle } = useTheme();

	return (
		<div className="relative flex min-h-dvh flex-col min-[900px]:flex-row min-[900px]:items-stretch">
			<aside
				className="grid justify-items-center gap-(--space-3) px-(--page-pad) pb-(--brand-band-pad) text-white
					min-[900px]:flex-none min-[900px]:basis-[44%] min-[900px]:content-between min-[900px]:justify-items-start min-[900px]:gap-(--space-6) min-[900px]:px-(--space-10) min-[900px]:py-(--space-12)"
				style={{
					backgroundImage: "var(--brand-band-bleed), var(--brand-band)",
				}}
			>
				<header
					className="flex min-h-12 w-full items-center justify-end text-white/90
						min-[900px]:absolute min-[900px]:top-2.5 min-[900px]:right-2.5 min-[900px]:z-3 min-[900px]:min-h-0 min-[900px]:w-auto"
					style={{
						paddingTop: "max(var(--space-1), env(safe-area-inset-top))",
					}}
				>
					<ThemeToggle dark={dark} onToggle={toggle} />
				</header>
				<span
					aria-hidden="true"
					className="grid size-18 place-items-center rounded-full bg-(--brand-badge-surface) shadow-(--brand-badge-shadow) transition-[background,box-shadow] duration-(--duration) ease-(--ease-out) min-[900px]:hidden"
				>
					<Logo tone={dark ? "white" : "gradient"} size={44} />
				</span>
				<img
					src="/brand/wordmark-white.svg"
					alt="BluPrint"
					className="block h-9 w-auto min-[900px]:hidden"
				/>
				<img
					src="/brand/logo-lockup-white.svg"
					alt="BluPrint"
					className="hidden h-13.5 w-auto self-center min-[900px]:block"
				/>
				<p className="hidden max-w-[34ch] text-base leading-normal text-white/92 min-[900px]:block">
					Pendências da obra mapeadas com pins sobre plantas, por unidade e por
					disciplina.
				</p>
			</aside>
			<main className="flex flex-1 place-items-start justify-center px-(--page-pad) pt-(--space-6) pb-(--space-10) min-[900px]:relative min-[900px]:place-items-center min-[900px]:px-(--page-pad-desktop) min-[900px]:py-(--page-pad-desktop)">
				<div className="w-full max-w-(--content-max)">{children}</div>
			</main>
		</div>
	);
}
