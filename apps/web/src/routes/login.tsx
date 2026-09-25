import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
	AuthShell,
	discardSession,
	internalPath,
	LoginPage,
	SessionSplash,
	sessionQueryOptions,
} from "@/features/auth";

export const Route = createFileRoute("/login")({
	// anything but an internal path is dropped, so the login can't be used to send someone to another site;
	// the key must stay present (as undefined), or the router's parent search merge lets the raw value through
	validateSearch: (search): { redirect?: string | undefined } => ({
		redirect: internalPath(search.redirect),
	}),
	beforeLoad: async ({ context, search }) => {
		// only a shortcut past the form: offline or API-down falls through to it, not the error boundary
		const session = await context.queryClient
			.query({ ...sessionQueryOptions, retry: false })
			.catch(() => null);
		if (session) throw redirect({ href: search.redirect ?? "/" });
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
					router.history.push(redirect ?? "/");
				}}
			/>
		</AuthShell>
	);
}
