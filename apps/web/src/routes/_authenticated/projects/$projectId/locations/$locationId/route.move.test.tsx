import { PROJECT_DELIVERED } from "@bluprint/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { nth } from "@/test/nth";
import { project } from "@/test/projectsApi";
import { json, renderAt, signedIn, stubApi } from "@/test/renderApp";
import { floor, structureOf, tower, writableApi } from "@/test/structureApi";

const user = userEvent.setup({ delay: null });

function build() {
	const ninth = floor("9º andar", ["901", "902", "903", "904"]);
	const tenth = floor("10º andar", ["1001"]);
	const towerA = tower("Torre A", [ninth, tenth]);
	return {
		ninth,
		tenth,
		towerA,
		several: structureOf([towerA, tower("Torre B")]),
	};
}

const obra = () => ({ ...project(3, "manager"), name: "Casa Moinhos" });

const pathOf = (id: string) => `/projects/${obra().id}/locations/${id}`;

async function pick(menuName: string, itemName: string) {
	await user.click(await screen.findByRole("button", { name: menuName }));
	await user.click(await screen.findByRole("menuitem", { name: itemName }));
}

const listedUnits = () =>
	screen
		.getAllByRole("button", { name: /^Ações da unidade / })
		.map((button) => button.getAttribute("aria-label")?.slice(17));

afterEach(() => {
	vi.unstubAllGlobals();
	toast.dismiss();
});

describe("moving a unit in the floor's list", () => {
	test("moves it one place up and shows the new order", async () => {
		const { ninth, several } = build();
		const second = nth(ninth.units, 1);
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await screen.findByRole("button", { name: "Ações da unidade 902" });

		await pick("Ações da unidade 902", "Mover para cima");

		await waitFor(() => {
			expect(listedUnits()).toEqual(["902", "901", "903", "904"]);
		});
		expect(api.moved).toEqual([{ locationId: second.id, direction: "up" }]);
	});

	test("moves it one place down", async () => {
		const { ninth, several } = build();
		const second = nth(ninth.units, 1);
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await screen.findByRole("button", { name: "Ações da unidade 902" });

		await pick("Ações da unidade 902", "Mover para baixo");

		await waitFor(() => {
			expect(listedUnits()).toEqual(["901", "903", "902", "904"]);
		});
		expect(api.moved).toEqual([{ locationId: second.id, direction: "down" }]);
	});

	test("leaves the list as it is at the top and at the end", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await screen.findByRole("button", { name: "Ações da unidade 901" });

		await pick("Ações da unidade 901", "Mover para cima");
		await waitFor(() => expect(api.moved).toHaveLength(1));
		await pick("Ações da unidade 904", "Mover para baixo");
		await waitFor(() => expect(api.moved).toHaveLength(2));

		expect(listedUnits()).toEqual(["901", "902", "903", "904"]);
	});
});

describe("moving from the page menu", () => {
	test("moves a floor up, meaning one floor higher", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));

		await pick("Ações do andar", "Mover para cima");

		await waitFor(() => {
			expect(api.moved).toEqual([{ locationId: ninth.id, direction: "up" }]);
		});
	});

	test("moves a floor down, meaning one floor lower", async () => {
		const { tenth, several } = build();
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(tenth.id));

		await pick("Ações do andar", "Mover para baixo");

		await waitFor(() => {
			expect(api.moved).toEqual([{ locationId: tenth.id, direction: "down" }]);
		});
	});

	test("moves a unit from its own page", async () => {
		const { ninth, several } = build();
		const unit = nth(ninth.units, 2);
		const api = writableApi(obra(), several);
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(unit.id));

		await pick("Ações da unidade", "Mover para cima");

		await waitFor(() => {
			expect(api.moved).toEqual([{ locationId: unit.id, direction: "up" }]);
		});
		expect(
			screen.getByRole("heading", { level: 1, name: "903" }),
		).toBeInTheDocument();
	});

	test("offers no moving on a tower or a common area", async () => {
		const { towerA, several } = build();
		stubApi(signedIn, { api: writableApi(obra(), several).handler });
		renderAt(pathOf(towerA.id));

		await user.click(
			await screen.findByRole("button", { name: "Ações da torre" }),
		);

		expect(
			screen.queryByRole("menuitem", { name: "Mover para cima" }),
		).not.toBeInTheDocument();
	});
});

describe("when moving fails", () => {
	test("keeps the order and says so in a toast", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			move: () => json({}, 500),
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await screen.findByRole("button", { name: "Ações da unidade 902" });

		await pick("Ações da unidade 902", "Mover para cima");

		expect(
			await screen.findByText(
				"Não foi possível mover. Confira sua conexão e tente de novo.",
			),
		).toBeVisible();
		expect(listedUnits()).toEqual(["901", "902", "903", "904"]);
	});

	test("says nothing when the obra was delivered meanwhile", async () => {
		const { ninth, several } = build();
		const api = writableApi(obra(), several, {
			move: () =>
				json(
					{
						type: "about:blank",
						title: "Conflict",
						status: 409,
						code: PROJECT_DELIVERED,
					},
					409,
				),
		});
		stubApi(signedIn, { api: api.handler });
		renderAt(pathOf(ninth.id));
		await screen.findByRole("button", { name: "Ações da unidade 902" });

		await pick("Ações da unidade 902", "Mover para cima");

		await waitFor(() => expect(api.moved).toHaveLength(1));
		expect(
			screen.queryByText(/Não foi possível mover/),
		).not.toBeInTheDocument();
	});
});
