export default async function newProject({ page, shot, expect, query, accounts }) {
	const session = await (await page.request.get("/api/auth/get-session")).json();
	const email = session.user.email;
	const nameField = page.getByRole("textbox", { name: "Nome da obra" });
	const unitsField = page.getByRole("textbox", { name: "Unidades reservadas" });
	const create = page.getByRole("button", { name: "Criar obra" });

	await page.goto("/projects/new");

	if (email === accounts.NO_UNITS_ADMIN_EMAIL) {
		await expect(page.getByText(/^Nenhuma unidade livre para uma obra nova\./)).toBeVisible();
		await expect(nameField).toBeDisabled();
		await expect(unitsField).toBeDisabled();
		await expect(create).toBeDisabled();
		await expect(page.getByText(/livres na construtora/)).toHaveCount(0);
		await shot("no-free-units");
		return;
	}

	if (email !== accounts.ADMIN_EMAIL) {
		await expect(page).toHaveURL(/\/projects$/);
		await expect(page.getByRole("heading", { name: "Nova obra" })).toHaveCount(0);
		await shot("redirected-to-list");
		return;
	}

	const units = await (await page.request.get("/api/organization/units")).json();
	const free = units.free;
	await expect(page.getByRole("heading", { level: 1, name: "Nova obra" })).toBeVisible();
	await expect(page.getByText(`${free} livres na construtora. Dá para ajustar depois.`)).toBeVisible();
	await shot("empty");

	await unitsField.fill("1x2");
	await expect(unitsField).toHaveValue("12");
	await expect(page.getByText(`${free} livres na construtora. Depois de criar, sobram ${free - 12}.`)).toBeVisible();
	await shot("typed");

	await unitsField.fill(String(free + 1));
	await create.click();
	await expect(page.getByText("Informe o nome da obra.")).toBeVisible();
	await expect(page.getByText(`De 1 a ${free} unidades.`)).toBeVisible();
	await shot("invalid");

	await nameField.fill("Casa Moinhos");
	await unitsField.fill("12");
	await create.click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/configuration$/);
	const projectId = new URL(page.url()).pathname.split("/")[2];
	await expect(page.getByText("Obra “Casa Moinhos” criada.")).toBeVisible();
	await expect(page.getByRole("heading", { level: 1, name: "Casa Moinhos" })).toBeVisible();
	await expect(page.locator('[data-sonner-toast][data-mounted="true"]')).toHaveCSS("opacity", "1");
	await shot("created");

	const rows = await query("SELECT name, reserved_units, status FROM project WHERE id = $1", [projectId]);
	expect(rows).toEqual([{ name: "Casa Moinhos", reserved_units: 12, status: "active" }]);
	const after = await (await page.request.get("/api/organization/units")).json();
	expect(after.free).toBe(free - 12);
}
