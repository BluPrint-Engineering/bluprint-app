import {
	NO_UNITS_LEFT,
	type OrganizationUnits,
	type ProjectSummary,
} from "@bluprint/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { project } from "@/test/projectsApi";
import {
	type ApiHandler,
	json,
	organization,
	renderAt,
	signedIn,
	stubApi,
} from "@/test/renderApp";
import { setViewport } from "@/test/viewport";

const ADMIN = { ...organization, role: "admin" as const };
const UNITS: OrganizationUnits = {
	contracted: 400,
	reserved: 100,
	free: 300,
	reclaimable: 100,
};
const CREATED_FAILED =
	"Não foi possível criar a obra. Confira sua conexão e tente de novo.";

interface Sent {
	id: string;
	name: string;
	units: number;
}

function problem(status: number, code: string, extra: object = {}) {
	return json(
		{ type: "about:blank", title: "Conflict", status, code, ...extra },
		status,
	);
}

function newProjectApi(options: {
	units?: () => Promise<Response> | Response;
	create?: (sent: Sent, attempt: number) => Promise<Response> | Response;
}) {
	const sent: Sent[] = [];
	const handler: ApiHandler = (url, init) => {
		if (url.pathname === "/api/organization/units") {
			return options.units ? options.units() : json(UNITS);
		}
		if (url.pathname === "/api/projects" && init?.method === "POST") {
			const body = JSON.parse(String(init.body)) as Sent;
			sent.push(body);
			if (options.create) return options.create(body, sent.length);
			return json(createdFrom(body), 201);
		}
		return undefined;
	};
	return { sent, handler };
}

function createdFrom(sent: Sent): ProjectSummary {
	return {
		...project(1),
		id: sent.id,
		name: sent.name,
		units: { reserved: sent.units, used: 0 },
	};
}

function openAsAdmin(api: ApiHandler) {
	const stub = stubApi(signedIn, { organization: ADMIN, api });
	return { ...renderAt("/projects/new"), ...stub };
}

async function fill(name: string, units: string) {
	const nameField = await screen.findByRole("textbox", {
		name: "Nome da obra",
	});
	await userEvent.clear(nameField);
	if (name) await userEvent.type(nameField, name);
	const unitsField = screen.getByRole("textbox", {
		name: "Unidades reservadas",
	});
	await userEvent.clear(unitsField);
	if (units) await userEvent.type(unitsField, units);
}

const submit = () =>
	userEvent.click(screen.getByRole("button", { name: "Criar obra" }));

describe("new project page", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	test("opens empty with the free units as help (N1)", async () => {
		const { handler } = newProjectApi({});
		openAsAdmin(handler);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Nova obra" }),
		).toBeInTheDocument();
		expect(
			await screen.findByText(
				"300 livres na construtora. Dá para ajustar depois.",
			),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Criar obra" })).toBeEnabled();
	});

	test("says how many units are left after creating while the number is typed (N1b)", async () => {
		const { handler } = newProjectApi({});
		openAsAdmin(handler);
		await fill("", "75");

		expect(
			screen.getByText(
				"300 livres na construtora. Depois de criar, sobram 225.",
			),
		).toBeInTheDocument();

		await fill("", "299");
		expect(
			screen.getByText("300 livres na construtora. Depois de criar, sobra 1."),
		).toBeInTheDocument();
		await fill("", "300");
		expect(
			screen.getByText("300 livres na construtora. Depois de criar, sobram 0."),
		).toBeInTheDocument();
	});

	test("drops anything but digits as the units are typed", async () => {
		const { handler } = newProjectApi({});
		openAsAdmin(handler);
		await fill("", "1a2.b");

		expect(
			screen.getByRole("textbox", { name: "Unidades reservadas" }),
		).toHaveValue("12");
	});

	test("explains an empty name, a long name and a bad reservation before sending (N3a-d)", async () => {
		const { handler, sent } = newProjectApi({});
		openAsAdmin(handler);
		await screen.findByText(/300 livres/);

		await fill("", "10");
		await submit();
		expect(
			await screen.findByText("Informe o nome da obra."),
		).toBeInTheDocument();

		await fill("a".repeat(121), "10");
		await submit();
		expect(
			await screen.findByText("O nome pode ter no máximo 120 caracteres."),
		).toBeInTheDocument();

		await fill("Casa Moinhos", "");
		await submit();
		expect(
			await screen.findByText("Informe quantas unidades reservar."),
		).toBeInTheDocument();

		await fill("Casa Moinhos", "301");
		await submit();
		expect(await screen.findByText("De 1 a 300 unidades.")).toBeInTheDocument();
		expect(sent).toHaveLength(0);
	});

	test("shows a skeleton in place of the help while the free units load (N8)", async () => {
		const { handler } = newProjectApi({ units: () => new Promise(() => {}) });
		openAsAdmin(handler);

		await screen.findByRole("textbox", { name: "Unidades reservadas" });
		expect(screen.queryByText(/livres na construtora/)).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Criar obra" })).toBeEnabled();
	});

	test("drops the help and the maximum when the free units fail to load", async () => {
		const { handler, sent } = newProjectApi({ units: () => json({}, 500) });
		openAsAdmin(handler);

		await fill("Casa Moinhos", "9999");
		await submit();

		await waitFor(() => {
			expect(sent).toEqual([
				expect.objectContaining({ name: "Casa Moinhos", units: 9999 }),
			]);
		});
		expect(screen.queryByText(/livres na construtora/)).not.toBeInTheDocument();
	});

	test("sends the id, the trimmed name and the number, then opens the configuration with the toast", async () => {
		const { handler, sent } = newProjectApi({});
		const { router } = openAsAdmin(handler);
		await screen.findByText(/300 livres/);
		await fill("  Casa Moinhos  ", "75");
		await submit();

		await waitFor(() => {
			expect(router.state.location.pathname).toMatch(
				/^\/projects\/[0-9a-f-]{36}\/configuration$/,
			);
		});
		expect(sent).toHaveLength(1);
		expect(sent[0]).toMatchObject({ name: "Casa Moinhos", units: 75 });
		expect(z.uuid().safeParse(sent[0]?.id).success).toBe(true);
		expect(router.state.location.pathname).toBe(
			`/projects/${sent[0]?.id}/configuration`,
		);
		expect(
			await screen.findByText("Obra “Casa Moinhos” criada."),
		).toBeInTheDocument();
		expect(
			await screen.findByRole("heading", { level: 1, name: "Casa Moinhos" }),
		).toBeInTheDocument();
	});

	test("shows Criando obra… and blocks a second send by button and by Enter (N4)", async () => {
		const { handler, sent } = newProjectApi({
			create: () => new Promise(() => {}),
		});
		openAsAdmin(handler);
		await screen.findByText(/300 livres/);
		await fill("Casa Moinhos", "75");
		const unitsField = screen.getByRole("textbox", {
			name: "Unidades reservadas",
		});
		await userEvent.type(unitsField, "{Enter}");
		await userEvent.type(unitsField, "{Enter}");

		const sending = await screen.findByRole("button", {
			name: "Criando obra…",
		});
		expect(sending).toBeDisabled();
		await userEvent.click(sending);
		expect(sent).toHaveLength(1);
		expect(
			screen.getByRole("textbox", { name: "Nome da obra" }),
		).toBeDisabled();
		expect(unitsField).toBeDisabled();
	});

	test("keeps the typed values and resends the same id after another failure (N7)", async () => {
		const { handler, sent } = newProjectApi({
			create: (body, attempt) =>
				attempt === 1 ? json({}, 500) : json(createdFrom(body), 201),
		});
		const { router } = openAsAdmin(handler);
		await screen.findByText(/300 livres/);
		await fill("Casa Moinhos", "75");
		await submit();

		expect(await screen.findByText(CREATED_FAILED)).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Nome da obra" })).toHaveValue(
			"Casa Moinhos",
		);
		expect(
			screen.getByRole("textbox", { name: "Unidades reservadas" }),
		).toHaveValue("75");

		await submit();

		await waitFor(() => {
			expect(router.state.location.pathname).toContain("/configuration");
		});
		expect(sent).toHaveLength(2);
		expect(sent[1]?.id).toBe(sent[0]?.id);
	});

	test("clears the failure alert when either field is edited", async () => {
		const { handler } = newProjectApi({ create: () => json({}, 500) });
		openAsAdmin(handler);
		await screen.findByText(/300 livres/);
		await fill("Casa Moinhos", "75");
		await submit();
		await screen.findByText(CREATED_FAILED);

		await userEvent.type(
			screen.getByRole("textbox", { name: "Nome da obra" }),
			"x",
		);

		expect(screen.queryByText(CREATED_FAILED)).not.toBeInTheDocument();
	});

	test("keeps the values and puts the server's free units on the field when someone reserved first (N5)", async () => {
		let free = UNITS.free;
		const { handler, sent } = newProjectApi({
			units: () => json({ ...UNITS, free }),
			create: () => {
				free = 120;
				return problem(409, NO_UNITS_LEFT, { requested: 200, available: 120 });
			},
		});
		openAsAdmin(handler);
		await screen.findByText(/300 livres/);
		await fill("Casa Moinhos", "200");
		await submit();

		expect(
			await screen.findByText(
				"Agora só restam 120 unidades livres. Ajuste a reserva e tente de novo.",
			),
		).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Nome da obra" })).toHaveValue(
			"Casa Moinhos",
		);
		expect(
			screen.getByRole("textbox", { name: "Unidades reservadas" }),
		).toHaveValue("200");
		expect(
			screen.getByRole("textbox", { name: "Unidades reservadas" }),
		).toBeInvalid();
		expect(screen.queryByText(CREATED_FAILED)).not.toBeInTheDocument();

		await fill("Casa Moinhos", "100");
		expect(
			await screen.findByText(
				"120 livres na construtora. Depois de criar, sobram 20.",
			),
		).toBeInTheDocument();

		await fill("Casa Moinhos", "130");
		await submit();
		expect(await screen.findByText("De 1 a 120 unidades.")).toBeInTheDocument();
		expect(sent).toHaveLength(1);
	});

	test("follows the refetched free units once they outgrow the ones the refusal reported", async () => {
		const { handler, sent } = newProjectApi({
			units: () => json(sent.length === 0 ? UNITS : { ...UNITS, free: 170 }),
			create: () =>
				problem(409, NO_UNITS_LEFT, { requested: 200, available: 120 }),
		});
		openAsAdmin(handler);
		await screen.findByText(/300 livres/);
		await fill("Casa Moinhos", "200");
		await submit();
		await screen.findByText(
			"Agora só restam 120 unidades livres. Ajuste a reserva e tente de novo.",
		);

		await fill("Casa Moinhos", "150");

		expect(
			await screen.findByText(
				"170 livres na construtora. Depois de criar, sobram 20.",
			),
		).toBeInTheDocument();
	});

	test.each([
		{
			state: "N6",
			reclaimable: 100,
			alert:
				"Nenhuma unidade livre para uma obra nova. Baixe a reserva de outra obra ou fale com a BluPrint.",
		},
		{
			state: "N6b",
			reclaimable: 0,
			alert: "Nenhuma unidade livre para uma obra nova. Fale com a BluPrint.",
		},
	])(
		"turns a refusal with nothing left into the disabled page alone, keeping the values ($state)",
		async ({ reclaimable, alert }) => {
			const exhausted = { ...UNITS, reserved: 400, free: 0, reclaimable };
			const { handler, sent } = newProjectApi({
				units: () => json(sent.length === 0 ? UNITS : exhausted),
				create: () =>
					problem(409, NO_UNITS_LEFT, { requested: 200, available: 0 }),
			});
			openAsAdmin(handler);
			await screen.findByText(/300 livres/);
			await fill("Casa Moinhos", "200");
			await submit();

			expect(await screen.findByText(alert)).toBeInTheDocument();
			expect(
				screen.queryByText(/Ajuste a reserva e tente de novo/),
			).not.toBeInTheDocument();
			expect(screen.queryByText(CREATED_FAILED)).not.toBeInTheDocument();
			const nameField = screen.getByRole("textbox", { name: "Nome da obra" });
			const unitsField = screen.getByRole("textbox", {
				name: "Unidades reservadas",
			});
			expect(nameField).toBeDisabled();
			expect(nameField).toHaveValue("Casa Moinhos");
			expect(unitsField).toBeDisabled();
			expect(unitsField).toHaveValue("200");
			expect(screen.getByRole("button", { name: "Criar obra" })).toBeDisabled();
		},
	);

	test("disables the page and suggests lowering another reservation when nothing is free but some is unused (N6)", async () => {
		const { handler } = newProjectApi({
			units: () => json({ ...UNITS, reserved: 400, free: 0 }),
		});
		openAsAdmin(handler);

		expect(
			await screen.findByText(
				"Nenhuma unidade livre para uma obra nova. Baixe a reserva de outra obra ou fale com a BluPrint.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("textbox", { name: "Nome da obra" }),
		).toBeDisabled();
		expect(
			screen.getByRole("textbox", { name: "Unidades reservadas" }),
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Criar obra" })).toBeDisabled();
		expect(screen.queryByText(/livres na construtora/)).not.toBeInTheDocument();
	});

	test("only points to the BluPrint when no reservation can be lowered (N6b)", async () => {
		const { handler } = newProjectApi({
			units: () => json({ ...UNITS, reserved: 400, free: 0, reclaimable: 0 }),
		});
		openAsAdmin(handler);

		expect(
			await screen.findByText(
				"Nenhuma unidade livre para uma obra nova. Fale com a BluPrint.",
			),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Criar obra" })).toBeDisabled();
	});

	test("lays out the same on a phone", async () => {
		setViewport("phone");
		const { handler } = newProjectApi({});
		openAsAdmin(handler);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Nova obra" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Obras" })).toBeInTheDocument();
	});

	test.each(["manager", "assistant"] as const)(
		"sends a %s back to the list without showing the page",
		async (role) => {
			stubApi(signedIn, { organization: { ...organization, role } });

			const { router } = renderAt("/projects/new");

			await waitFor(() => {
				expect(router.state.location.pathname).toBe("/projects");
			});
			expect(
				screen.queryByRole("heading", { name: "Nova obra" }),
			).not.toBeInTheDocument();
		},
	);

	test("sends a visitor without an organization back to the list", async () => {
		stubApi(signedIn, {
			api: (url) =>
				url.pathname === "/api/organization"
					? json(
							{
								code: "ORGANIZATION_NOT_FOUND",
								status: 404,
								title: "Not Found",
								type: "about:blank",
							},
							404,
						)
					: undefined,
		});

		const { router } = renderAt("/projects/new");

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/projects");
		});
	});
});
