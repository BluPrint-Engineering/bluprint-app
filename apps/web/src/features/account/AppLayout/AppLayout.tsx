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
		<>
			<AppHeader user={user} />
			{children}
			<Toaster />
		</>
	);
}
