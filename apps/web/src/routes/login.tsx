import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthShell, LoginPage, SessionSplash } from "@/features/auth";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/login")({
	beforeLoad: async () => {
		// offline or API-down: fall through to the login form, not the router's error boundary
		const session = await authClient.getSession().catch(() => null);
		if (session?.data) throw redirect({ to: "/" });
	},
	pendingComponent: SessionSplash,
	pendingMs: 0,
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = Route.useNavigate();
	return (
		<AuthShell>
			<LoginPage onSuccess={() => navigate({ to: "/" })} />
		</AuthShell>
	);
}
