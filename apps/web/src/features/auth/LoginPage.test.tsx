import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LoginPage } from "./LoginPage";

function stubSignInFetch(
	response: {
		status: number;
		body: unknown;
		headers?: Record<string, string>;
	},
	implementation?: (input: RequestInfo | URL, init?: RequestInit) => void,
) {
	const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
		implementation?.(input, init);
		return Promise.resolve(
			new Response(JSON.stringify(response.body), {
				status: response.status,
				headers: {
					"content-type": "application/problem+json",
					...response.headers,
				},
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
		instance: "/api/auth/sign-in/email",
		code: overrides.code,
	};
}

function renderLoginPage(onSuccess = vi.fn()) {
	render(<LoginPage onSuccess={onSuccess} />);
	return { onSuccess };
}

async function fillAndSubmit(email: string, password: string) {
	const user = userEvent.setup();
	if (email) await user.type(screen.getByLabelText("E-mail"), email);
	if (password) await user.type(screen.getByLabelText("Senha"), password);
	await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginPage", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("shows the translated error for wrong credentials", async () => {
		stubSignInFetch({
			status: 401,
			body: problem({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" }),
		});
		renderLoginPage();

		await fillAndSubmit("ana@horizonte.test", "senha-errada");

		await waitFor(() => {
			expect(
				screen.getByText("E-mail ou senha incorretos."),
			).toBeInTheDocument();
		});
	});

	test("signs in and calls onSuccess, without sending rememberMe", async () => {
		let sentBody: unknown;
		const fetchMock = stubSignInFetch(
			{
				status: 200,
				body: {
					redirect: false,
					token: "t",
					user: { email: "ana@horizonte.test" },
				},
			},
			(_input, init) => {
				sentBody = init?.body ? JSON.parse(init.body as string) : undefined;
			},
		);
		const { onSuccess } = renderLoginPage();

		await fillAndSubmit("ana@horizonte.test", "bluprint123");

		await waitFor(() => {
			expect(onSuccess).toHaveBeenCalled();
		});
		expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
			"/api/auth/sign-in/email",
		);
		expect(sentBody).toMatchObject({
			email: "ana@horizonte.test",
			password: "bluprint123",
		});
		expect(sentBody).not.toHaveProperty("rememberMe");
	});

	test("validates the form in pt-BR without calling the API", async () => {
		const fetchMock = stubSignInFetch({ status: 200, body: {} });
		renderLoginPage();

		await fillAndSubmit("", "");

		await waitFor(() => {
			expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
		});
		expect(screen.getByText("Informe a sua senha.")).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("disables the button and shows a loading label while the request is pending", async () => {
		stubPendingFetch();
		renderLoginPage();

		await fillAndSubmit("ana@horizonte.test", "bluprint123");

		const button = await screen.findByRole("button", { name: "Entrando…" });
		expect(button).toBeDisabled();
	});

	test("translates a rate-limit response", async () => {
		stubSignInFetch({
			status: 429,
			body: problem({ status: 429, code: "TOO_MANY_REQUESTS" }),
		});
		renderLoginPage();

		await fillAndSubmit("ana@horizonte.test", "bluprint123");

		await waitFor(() => {
			expect(
				screen.getByText(
					"Muitas tentativas seguidas. Aguarde um minuto e tente de novo.",
				),
			).toBeInTheDocument();
		});
	});

	test("translates a network failure", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.reject(new Error("network down"))),
		);
		renderLoginPage();

		await fillAndSubmit("ana@horizonte.test", "bluprint123");

		await waitFor(() => {
			expect(
				screen.getByText(
					"Não foi possível entrar agora. Verifique sua conexão e tente de novo.",
				),
			).toBeInTheDocument();
		});
	});

	test("toggles password visibility", async () => {
		const user = userEvent.setup();
		renderLoginPage();

		const password = screen.getByLabelText("Senha");
		expect(password).toHaveAttribute("type", "password");

		await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
		expect(password).toHaveAttribute("type", "text");

		await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
		expect(password).toHaveAttribute("type", "password");
	});
});
