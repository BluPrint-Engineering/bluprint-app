import type * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "./AppHeader";
import type { AccountUser } from "./UserMenu";

/** What every screen after login sits in: the header above, and the toasts any of them raises. */
export function AppLayout({
	user,
	children,
}: {
	user: AccountUser;
	children: React.ReactNode;
}) {
	return (
		// a screen fills the height under the header with flex-1, so a short one can pin content to the bottom
		<div className="flex min-h-dvh flex-col">
			<AppHeader user={user} />
			{children}
			<Toaster />
		</div>
	);
}
