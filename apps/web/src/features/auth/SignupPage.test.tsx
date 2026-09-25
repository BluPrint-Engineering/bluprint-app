import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { SignupPage } from "./SignupPage";

function stubSignUpFetch(
	response: { status: number; body: unknown },
	implementation?: (input: RequestInfo | URL, init?: RequestInit) => void,
) {
	const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
		implementation?.(input, init);
		return Promise.resolve(
			new Response(JSON.stringify(response.body), {
				status: response.status,
				headers: { "content-type": "application/problem+json" },
			}),
		);
	});

	vi.stubGlobal("fetch", fetchMock);

	return fetchMock;
}

function stubPendingFetch() {
	const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function problem(overrides: { status: number; code: string }) {
	return {
		type: "about:blank",
		title: "Problem",
		status: overrides.status,
		detail: "developer text, never shown",
		instance: "/api/auth/sign-up/email",
		code: overrides.code,
	};
}

// the page links to /login, and a router Link needs a router around it
async function renderSignupPage(onSuccess = vi.fn()) {
	const rootRoute = createRootRoute({
		component: () => <SignupPage onSuccess={onSuccess} />,
	});
	const router = createRouter({
		routeTree: rootRoute,
		history: createMemoryHistory({ initialEntries: ["/signup"] }),
	});
	render(<RouterProvider router={router} />);
	await screen.findByLabelText("Nome completo");
	return { onSuccess };
}

async function fillAndSubmit({
	name = "Ana Souza",
	email = "ana@horizonte.test",
	password = "tres-lajes-e-um-prumo",
	acceptTerms = true,
} = {}) {
	const user = userEvent.setup();
	if (name) await user.type(screen.getByLabelText("Nome completo"), name);
	if (email) await user.type(screen.getByLabelText("E-mail"), email);
	if (password) await user.type(screen.getByLabelText("Senha"), password);
	if (acceptTerms)
		await user.click(
			screen.getByRole("checkbox", {
				name: "Aceito os termos de uso e a política de privacidade",
			}),
		);
	await user.click(screen.getByRole("button", { name: "Criar conta" }));
}

describe("SignupPage", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("signs up with name, e-mail and password and calls onSuccess", async () => {
		let sentBody: unknown;
		const fetchMock = stubSignUpFetch(
			{
				status: 200,
				body: { token: "t", user: { email: "ana@horizonte.test" } },
			},
			(_input, init) => {
				sentBody = init?.body ? JSON.parse(init.body as string) : undefined;
			},
		);
		const { onSuccess } = await renderSignupPage();

		await fillAndSubmit();

		await waitFor(() => {
			expect(onSuccess).toHaveBeenCalled();
		});
		expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
			"/api/auth/sign-up/email",
		);
		expect(sentBody).toMatchObject({
			name: "Ana Souza",
			email: "ana@horizonte.test",
			password: "tres-lajes-e-um-prumo",
		});
	});

	test("validates name, e-mail and password in pt-BR without calling the API", async () => {
		const fetchMock = stubSignUpFetch({ status: 200, body: {} });
		await renderSignupPage();

		await fillAndSubmit({ name: "  Al ", email: "ana@", password: "1234567" });

		await waitFor(() => {
			expect(
				screen.getByText("Informe o seu nome completo."),
			).toBeInTheDocument();
		});
		expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
		expect(
			screen.getByText("A senha precisa de pelo menos 8 caracteres."),
		).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("requires accepting the terms without calling the API", async () => {
		const fetchMock = stubSignUpFetch({ status: 200, body: {} });
		await renderSignupPage();

		await fillAndSubmit({ acceptTerms: false });

		await waitFor(() => {
			expect(
				screen.getByText("Aceite os termos para continuar."),
			).toBeInTheDocument();
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("tells an existing account to sign in, with a link to the login", async () => {
		stubSignUpFetch({
			status: 422,
			body: problem({
				status: 422,
				code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
			}),
		});
		await renderSignupPage();

		await fillAndSubmit();

		const alert = await screen.findByRole("alert");
		expect(
			within(alert).getByText("Já existe uma conta com este e-mail."),
		).toBeInTheDocument();
		expect(within(alert).getByRole("link", { name: "Entrar" })).toHaveAttribute(
			"href",
			"/login",
		);
	});

	test("translates a too-short password from the API like the client check", async () => {
		stubSignUpFetch({
			status: 400,
			body: problem({ status: 400, code: "PASSWORD_TOO_SHORT" }),
		});
		await renderSignupPage();

		await fillAndSubmit();

		expect(
			await screen.findByText("A senha precisa de pelo menos 8 caracteres."),
		).toBeInTheDocument();
	});

	test("rejects a password longer than 64 characters without calling the API", async () => {
		const fetchMock = stubSignUpFetch({ status: 200, body: {} });
		await renderSignupPage();

		await fillAndSubmit({ password: "prumo-".repeat(11) });

		expect(
			await screen.findByText("A senha pode ter no máximo 64 caracteres."),
		).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test.each([
		["built on the product's name", "bluprint123"],
		["built on the person's own name", "Souza!2026"],
	])("rejects a password %s without calling the API", async (_, password) => {
		const fetchMock = stubSignUpFetch({ status: 200, body: {} });
		await renderSignupPage();

		await fillAndSubmit({ password });

		expect(
			await screen.findByText(
				"Essa senha é fácil de adivinhar. Evite senhas comuns, sequências e o seu nome ou e-mail.",
			),
		).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("translates a breached password from the API", async () => {
		stubSignUpFetch({
			status: 400,
			body: problem({ status: 400, code: "PASSWORD_COMPROMISED" }),
		});
		await renderSignupPage();

		await fillAndSubmit();

		expect(
			await screen.findByText(
				"Essa senha já apareceu em vazamentos de outros sites. Escolha outra.",
			),
		).toBeInTheDocument();
	});

	test("translates a rate-limit response", async () => {
		stubSignUpFetch({
			status: 429,
			body: problem({ status: 429, code: "TOO_MANY_REQUESTS" }),
		});
		await renderSignupPage();

		await fillAndSubmit();

		expect(
			await screen.findByText(
				"Muitas tentativas seguidas. Aguarde um minuto e tente de novo.",
			),
		).toBeInTheDocument();
	});

	test("shows the generic message when self-signup is disabled on the server", async () => {
		stubSignUpFetch({
			status: 403,
			body: problem({ status: 403, code: "SELF_SIGNUP_DISABLED" }),
		});
		await renderSignupPage();

		await fillAndSubmit();

		expect(
			await screen.findByText(
				"Não foi possível criar a conta agora. Tente de novo mais tarde.",
			),
		).toBeInTheDocument();
	});

	test("shows the generic message on a network failure", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.reject(new Error("network down"))),
		);
		await renderSignupPage();

		await fillAndSubmit();

		expect(
			await screen.findByText(
				"Não foi possível criar a conta agora. Tente de novo mais tarde.",
			),
		).toBeInTheDocument();
	});

	test("disables the button and shows a loading label while the request is pending", async () => {
		stubPendingFetch();
		await renderSignupPage();

		await fillAndSubmit();

		const button = await screen.findByRole("button", {
			name: "Criando conta…",
		});
		expect(button).toBeDisabled();
	});

	test("toggles password visibility", async () => {
		const user = userEvent.setup();
		await renderSignupPage();

		const password = screen.getByLabelText("Senha");
		expect(password).toHaveAttribute("type", "password");

		await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
		expect(password).toHaveAttribute("type", "text");

		await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
		expect(password).toHaveAttribute("type", "password");
	});

	test("links an existing account to the login", async () => {
		await renderSignupPage();

		expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
			"href",
			"/login",
		);
	});
});
