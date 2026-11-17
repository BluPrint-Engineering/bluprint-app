import type { Organization } from "@bluprint/shared";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import {
	type ApiHandler,
	json,
	organization as managerOrganization,
	signedIn,
} from "./renderApp";

export type Account = typeof signedIn;

export const otherAccount: Account = {
	session: { id: "s2" },
	user: {
		id: "u2",
		name: "Bruno Lima",
		email: "bruno@horizonte.test",
		image: null,
	},
};

const user = userEvent.setup({ delay: null });

export function expiringServer(
	api: ApiHandler,
	options: { organization?: Organization } = {},
) {
	let session: Account | null = signedIn;
	let nextAccount = signedIn;
	let expireNext = false;
	const writes: string[] = [];
	const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(String(input), "http://localhost");
		if (url.pathname.endsWith("/get-session")) return json(session);
		if (url.pathname.endsWith("/sign-in/email")) {
			session = nextAccount;
			return json({ token: "t", user: nextAccount.user });
		}
		if (url.pathname.endsWith("/sign-out")) {
			session = null;
			return json({ success: true });
		}
		const method = init?.method ?? "GET";
		if (method !== "GET") {
			writes.push(`${method} ${url.pathname}`);
			if (expireNext) {
				expireNext = false;
				session = null;
				return json({}, 401);
			}
		}
		const answered = api(url, init);
		if (answered) return Promise.resolve(answered);
		if (url.pathname === "/api/organization") {
			return json(options.organization ?? managerOrganization);
		}
		if (url.pathname === "/api/projects") {
			return json({
				items: [],
				total: 0,
				counts: { active: 0, delivered: 0 },
			});
		}
		return json({});
	});
	vi.stubGlobal("fetch", fetchMock);
	return {
		writes,
		expireNextWrite() {
			expireNext = true;
		},
		signInNext(account: Account) {
			nextAccount = account;
		},
	};
}

export async function signInAgain(account: Account = signedIn) {
	await user.type(await screen.findByLabelText("E-mail"), account.user.email);
	await user.type(screen.getByLabelText("Senha"), "senha-da-conta");
	await user.click(screen.getByRole("button", { name: "Entrar" }));
}

export async function signOut(account: Account) {
	await user.click(
		await screen.findByRole("button", {
			name: `Conta de ${account.user.name}`,
		}),
	);
	await user.click(screen.getByRole("menuitem", { name: "Sair" }));
	await screen.findByLabelText("E-mail");
}
