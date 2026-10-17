export default async function projectList({ page, shot, expect, accounts }) {
	const session = await (await page.request.get("/api/auth/get-session")).json();
	const email = session.user.email;
	const newProject = page.getByRole("link", { name: "Nova obra" });
	const disabled = page.getByRole("button", { name: "Nova obra" });

	await page.goto("/projects");
	await expect(page.getByRole("list", { name: "Obras" })).toBeVisible();

	if (email === accounts.MANAGER_EMAIL) {
		await expect(newProject).toHaveCount(0);
		await expect(disabled).toHaveCount(0);
		await expect(page.getByText(/unidades? livres?/)).toHaveCount(0);
		await shot("manager-no-entry");
		return;
	}

	const units = await (await page.request.get("/api/organization/units")).json();
	if (email === accounts.NO_UNITS_ADMIN_EMAIL) {
		await expect(units.free).toBe(0);
		await expect(
			page.getByText("Nenhuma unidade livre. Baixe a reserva de uma obra ou fale com a BluPrint."),
		).toBeVisible();
		await expect(disabled).toBeDisabled();
		await expect(newProject).toHaveCount(0);
		await shot("no-free-units");
		return;
	}

	await expect(page.getByRole("link", { name: `${units.free} unidades livres` })).toHaveAttribute("href", "/units");
	await expect(newProject).toHaveAttribute("href", "/projects/new");
	await shot("entry");
	await newProject.click();
	await expect(page).toHaveURL("/projects/new");
	await shot("new-project-page");
}
