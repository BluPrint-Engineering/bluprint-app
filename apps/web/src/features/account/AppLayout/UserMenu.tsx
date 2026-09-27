import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { discardSession, signOut } from "@/features/auth";
import { useTheme } from "@/lib/useTheme";
import { organizationQueryOptions } from "../api";
import { initialsOf } from "./initialsOf";

export interface AccountUser {
	name: string;
	email: string;
	image?: string | null | undefined;
}

function UserAvatar({
	user,
	size,
}: {
	user: AccountUser;
	size: "default" | "lg";
}) {
	return (
		<Avatar size={size} aria-hidden="true">
			{user.image && <AvatarImage src={user.image} alt="" />}
			<AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
		</Avatar>
	);
}

export function UserMenu({ user }: { user: AccountUser }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: organization } = useQuery(organizationQueryOptions);
	const { dark, setDark } = useTheme();
	const [open, setOpen] = useState(false);
	const [signingOut, setSigningOut] = useState(false);
	const themeLabelId = useId();

	async function handleSignOut() {
		if (signingOut) return;
		setSigningOut(true);
		try {
			await signOut();
		} catch {
			setSigningOut(false);
			setOpen(false);
			toast.error(
				"Não foi possível sair. Confira sua conexão e tente de novo.",
			);
			return;
		}
		// the cached session would send the login straight back here
		discardSession(queryClient);
		await router.navigate({ to: "/login" });
		// only after leaving: cleared while mounted, this screen's queries would refetch without a session
		queryClient.clear();
	}

	return (
		<DropdownMenu
			open={open}
			onOpenChange={(next) => {
				if (!signingOut) setOpen(next);
			}}
		>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label={`Conta de ${user.name}`}
					className="md:w-auto md:gap-(--space-2) md:py-(--space-1) md:pr-(--space-2) md:pl-(--space-1)"
				>
					<UserAvatar user={user} size="default" />
					<span className="hidden text-sm font-medium md:inline">
						{user.name}
					</span>
					<ChevronDown
						aria-hidden="true"
						className="hidden text-muted-foreground md:block"
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" aria-label="Conta" className="w-78">
				<DropdownMenuLabel className="flex items-center gap-(--space-3) py-(--space-3)">
					<UserAvatar user={user} size="lg" />
					<div className="grid min-w-0 gap-0.5">
						<span className="text-base leading-snug font-semibold">
							{user.name}
						</span>
						<span className="truncate text-sm text-muted-foreground">
							{user.email}
						</span>
						{organization?.role === "admin" && (
							<span className="text-sm text-muted-foreground">
								Admin da construtora
							</span>
						)}
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<div className="flex min-h-(--tap-min) items-center justify-between gap-(--space-3) pl-(--space-3)">
					<span id={themeLabelId}>Tema</span>
					<ToggleGroup
						type="single"
						size="sm"
						aria-labelledby={themeLabelId}
						value={dark ? "dark" : "light"}
						onValueChange={(value) => {
							// a single toggle group reports "" when the pressed item is pressed again
							if (value) setDark(value === "dark");
						}}
						disabled={signingOut}
					>
						<ToggleGroupItem value="light" aria-label="Tema claro">
							<Sun aria-hidden="true" />
						</ToggleGroupItem>
						<ToggleGroupItem value="dark" aria-label="Tema escuro">
							<Moon aria-hidden="true" />
						</ToggleGroupItem>
					</ToggleGroup>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					aria-busy={signingOut || undefined}
					onSelect={(event) => {
						event.preventDefault();
						void handleSignOut();
					}}
				>
					{signingOut ? (
						<Spinner aria-hidden="true" className="size-4.5" />
					) : (
						<LogOut aria-hidden="true" />
					)}
					Sair
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
