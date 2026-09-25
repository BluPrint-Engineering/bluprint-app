import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthShell, SessionSplash, SignupPage } from "@/features/auth";
import { authClient } from "@/lib/auth";
import { selfSignupAllowed } from "@/lib/env";

export const Route = createFileRoute("/signup")({
	beforeLoad: async () => {
		// the login footer already explains that access comes by invitation
		if (!selfSignupAllowed()) throw redirect({ to: "/login" });
		// offline or API-down: fall through to the signup form, not the router's error boundary
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
			<SignupPage onSuccess={() => navigate({ to: "/" })} />
		</AuthShell>
	);
}
