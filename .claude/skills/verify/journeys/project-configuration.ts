export default async function projectConfiguration({ page, shot, expect, query, accounts }) {
	const session = await (await page.request.get("/api/auth/get-session")).json();
	const email = session.user.email;
	const role = email === accounts.ADMIN_EMAIL ? "admin" : email === accounts.MANAGER_EMAIL ? "manager" : "assistant";
	const card = page.getByRole("region", { name: "Dados da obra" });
	const nameField = page.getByRole("textbox", { name: "Nome da obra" });

	await page.goto("/projects?q=Jardins");
	await page.getByRole("link", { name: /Residencial Jardins/ }).click();
	const entry = page.getByRole("link", { name: "Configuração da obra" });
	await expect(entry).toBeVisible();
	await shot("home-entry");
	await entry.click();
	await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}\/configuration$/);
	const projectId = new URL(page.url()).pathname.split("/")[2];
	const lastActivity = async () =>
		(await query("SELECT last_activity_at FROM project WHERE id = $1", [projectId]))[0].last_activity_at.toISOString();
	await expect(page.getByRole("heading", { level: 2, name: "Configuração" })).toBeVisible();
	await expect(card.getByRole("heading", { level: 3, name: "Dados da obra" })).toBeVisible();
	await expect(card.getByText("Residencial Jardins")).toBeVisible();
	await expect(page.getByText("Status da obra")).toHaveCount(0);
	await expect(page.getByRole("navigation")).toHaveCount(0);
	await shot("configuration");

	if (role === "assistant") {
		await expect(card.getByRole("button", { name: "Renomear" })).toHaveCount(0);
		await expect(card.getByText("Só o gerente de obra ou o admin da construtora renomeia a obra.")).toBeVisible();
		await shot("assistant-locked");
		return;
	}

	const activityBefore = await lastActivity();
	await card.getByRole("button", { name: "Renomear" }).click();
	await expect(nameField).toBeFocused();
	await shot("rename-open");
	await nameField.fill("");
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByText("Informe o nome da obra.")).toBeVisible();
	await shot("rename-empty");
	await nameField.fill("x".repeat(121));
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByText("O nome pode ter no máximo 120 caracteres.")).toBeVisible();
	await shot("rename-too-long");
	await nameField.fill("Residencial Jardins II");
	await page.keyboard.press("Escape");
	await expect(nameField).toHaveCount(0);
	await expect(card.getByText("Residencial Jardins", { exact: true })).toBeVisible();

	await card.getByRole("button", { name: "Renomear" }).click();
	await nameField.fill("Residencial Jardins II");
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Residencial Jardins II" })).toBeVisible();
	await expect(card.getByText("Residencial Jardins II")).toBeVisible();
	await expect(nameField).toHaveCount(0);
	await shot("renamed");
	expect(await lastActivity()).toBe(activityBefore);

	await page.getByRole("link", { name: "Início da obra" }).click();
	await page.getByRole("link", { name: "Obras", exact: true }).click();
	await page.getByPlaceholder("Buscar obra").fill("Jardins II");
	await expect(page.getByRole("link", { name: /Residencial Jardins II/ })).toBeVisible();
	await shot("list-after-rename");

	await page.getByRole("link", { name: /Residencial Jardins II/ }).click();
	await page.getByRole("link", { name: "Configuração da obra" }).click();
	await card.getByRole("button", { name: "Renomear" }).click();
	await nameField.fill("Residencial Jardins");
	await page.getByRole("button", { name: "Salvar" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Residencial Jardins", exact: true })).toBeVisible();

	await page.goto("/projects?status=delivered&q=Vila Nova");
	await page.getByRole("link", { name: /Residencial Vila Nova/ }).click();
	await page.getByRole("link", { name: "Configuração da obra" }).click();
	await expect(card.getByText("A obra foi entregue: o nome não pode mais ser alterado.")).toBeVisible();
	await expect(card.getByRole("button", { name: "Renomear" })).toHaveCount(0);
	await shot("delivered-locked");
}
