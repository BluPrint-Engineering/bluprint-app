import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
	AuthShell,
	discardSession,
	LoginPage,
	peekSession,
	SessionSplash,
} from "@/features/auth";
import { internalPath } from "@/utils/internalPath";

export const Route = createFileRoute("/login")({
	// the key stays present (as undefined), or the router's parent search merge lets the raw value through
	validateSearch: (search): { redirect?: string | undefined } => ({
		redirect: internalPath(search.redirect),
	}),
	beforeLoad: async ({ context, search }) => {
		const session = await peekSession(context.queryClient);
		if (session) throw redirect({ href: search.redirect ?? "/projects" });
	},
	pendingComponent: SessionSplash,
	pendingMs: 0,
	component: RouteComponent,
});

function RouteComponent() {
	const router = useRouter();
	const { queryClient } = Route.useRouteContext();
	const { redirect } = Route.useSearch();
	return (
		<AuthShell>
			<LoginPage
				onSuccess={() => {
					// the cached "no session" would send the guard straight back to the login
					discardSession(queryClient);
					router.history.push(redirect ?? "/projects");
				}}
			/>
		</AuthShell>
	);
}
