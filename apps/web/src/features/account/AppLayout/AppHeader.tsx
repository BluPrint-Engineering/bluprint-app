import { Link } from "@tanstack/react-router";
import { type AccountUser, UserMenu } from "./UserMenu";

// scrolls away on mobile, where each screen keeps its own sticky row instead
export function AppHeader({ user }: { user: AccountUser }) {
	return (
		<header className="relative top-0 z-30 border-b border-border bg-background pt-[env(safe-area-inset-top)] md:sticky">
			<div className="mx-auto flex h-14 max-w-(--content-max-wide) items-center justify-between gap-(--space-3) px-(--page-pad) md:h-16 md:px-(--page-pad-desktop)">
				<Link
					to="/projects"
					aria-label="BluPrint, obras"
					className="flex min-h-(--tap-min) items-center rounded-md focus-visible:shadow-(--shadow-focus) focus-visible:outline-none"
				>
					<img
						src="/brand/logo-lockup.svg"
						alt=""
						className="h-7 w-auto md:h-8 dark:hidden"
					/>
					<img
						src="/brand/logo-lockup-white.svg"
						alt=""
						className="hidden h-7 w-auto md:h-8 dark:block"
					/>
				</Link>
				<UserMenu user={user} />
			</div>
		</header>
	);
}
