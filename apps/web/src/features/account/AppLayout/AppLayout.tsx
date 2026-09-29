import type * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "./AppHeader";
import type { AccountUser } from "./UserMenu";

export function AppLayout({
	user,
	children,
}: {
	user: AccountUser;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-dvh flex-col">
			<AppHeader user={user} />
			{children}
			<Toaster />
		</div>
	);
}
