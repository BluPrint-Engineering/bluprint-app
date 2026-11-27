import type {
	LocationDetail,
	OrganizationReservations,
	ProjectSummary,
} from "@bluprint/shared";
import { onlineManager } from "@tanstack/react-query";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { SessionDraftKind } from "@/features/auth/sessionDraft";
import { structureDraftKey } from "@/features/structure";
import { uuidV7 } from "@/lib/uuidV7";
import { project } from "./projectsApi";
import { json, organization, renderAt, signedIn } from "./renderApp";
import {
	expiringServer,
	otherAccount,
	signInAgain,
	signOut,
} from "./sessionExpiry";
import {
	catalogApi,
	combine,
	droppedRoom,
	floor,
	locationIn,
	room,
	structureApi,
	structureOf,
	tower,
	typologiesApi,
	typologyOf,
	typologyServer,
	writableApi,
} from "./structureApi";

const user = userEvent.setup({ delay: null });

interface Entry {
	open: () => Promise<void>;
	fill: () => Promise<void>;
	expectTyped: () => Promise<void>;
	expectCurrent: () => Promise<void>;
	submit: () => Promise<void>;
	cancel: () => Promise<void>;
	exit?: () => Promise<void>;
	reenter?: () => Promise<void>;
	afterSave?: () => Promise<void>;
	whileSignedOut?: () => void;
	afterRestore?: () => Promise<void>;
	afterCancel?: () => Promise<void>;
	openedByAddress?: true;
	shows: string[];
	focusAfterCancel?: () => Promise<HTMLElement>;
	focusAfterPlainCancel?: () => Promise<HTMLElement>;
	focusAfterSave?: () => Promise<HTMLElement>;
	request: string;
	staleRestore?: {
		saveElsewhere: () => void;
		expectChangedAlert: () => Promise<void>;
		sentVersions: () => unknown[];
	};
}

interface Page {
	path: string;
	ready: () => Promise<unknown>;
	inline: string[];
	entries: Record<string, Entry>;
	server: ReturnType<typeof expiringServer>;
}

function openForms(inline: string[]): string[] {
	const dialogs = screen
		.queryAllByRole("dialog", { hidden: true })
		.map((dialog) => {
			const title = dialog.getAttribute("aria-labelledby");
			return (title && document.getElementById(title)?.textContent) ?? "";
		});
	const forms = inline.filter(
		(name) =>
			screen.queryByRole("textbox", { name }) !== null ||
			screen.queryByRole("combobox", { name: new RegExp(`^${name}`) }) !== null,
	);
	return [...dialogs, ...forms];
}

const byRole = (role: string, name: string) => () =>
	screen.findByRole(role, { name });

export async function pick(menu: string, item: string) {
	await user.click(await screen.findByRole("button", { name: menu }));
	await user.click(await screen.findByRole("menuitem", { name: item }));
}

export const click = (role: string, name: string) => async () => {
	await user.click(await screen.findByRole(role, { name }));
};

const submitBeside = (field: string, button: string) => async () => {
	const form = (await screen.findByLabelText(field)).closest("form");
	if (!form) throw new Error(`no form around ${field}`);
	await user.click(within(form).getByRole("button", { name: button }));
};

const pressEscape = async () => {
	await user.keyboard("{Escape}");
};

function textField(
	name: string,
	typed: string,
	current: string,
	role: "textbox" | "combobox" = "textbox",
): Pick<Entry, "fill" | "expectTyped" | "expectCurrent"> {
	const field = () => screen.findByRole(role, { name });
	return {
		fill: async () => {
			const found = await field();
			await user.clear(found);
			await user.type(found, typed);
		},
		expectTyped: async () => expect(await field()).toHaveValue(typed),
		expectCurrent: async () => expect(await field()).toHaveValue(current),
	};
}

async function expireOnSave(page: Page, entry: Entry) {
	await entry.open();
	await entry.fill();
	page.server.expireNextWrite();
	await entry.submit();
	await screen.findByLabelText("E-mail");
	entry.whileSignedOut?.();
	await signInAgain();
	await page.ready();
}

async function reload(page: Page) {
	cleanup();
	renderAt(page.path);
	await page.ready();
}

async function expectRestored(page: Page, entry: Entry) {
	await entry.expectTyped();
	await waitFor(() => expect(openForms(page.inline)).toEqual(entry.shows));
}

export async function expectNothingOpen(page: Page) {
	await waitFor(() => expect(openForms(page.inline)).toEqual([]));
}

export async function expectServerValue(entry: Entry) {
	await entry.open();
	await entry.expectCurrent();
	await entry.cancel();
	await entry.exit?.();
	await entry.reenter?.();
}

function entryOf(page: Page, key: string): Entry {
	const entry = page.entries[key];
	if (!entry) throw new Error(`no entry ${key}`);
	return entry;
}

async function restoreThenCancel(page: Page, entry: Entry) {
	renderAt(page.path);
	await page.ready();

	await expireOnSave(page, entry);
	await expectRestored(page, entry);
	await entry.afterRestore?.();
	expect(page.server.writes).toEqual([entry.request]);

	await entry.cancel();
	await entry.afterCancel?.();
	const { focusAfterCancel } = entry;
	if (focusAfterCancel) {
		await waitFor(async () => expect(await focusAfterCancel()).toHaveFocus());
	}
	await entry.exit?.();
	await entry.reenter?.();
	await expectNothingOpen(page);
}

async function runEntryRow(page: Page, key: string) {
	const entry = entryOf(page, key);
	await restoreThenCancel(page, entry);
	await expectServerValue(entry);

	await reload(page);
	await expectNothingOpen(page);
	expect(page.server.writes).toEqual([entry.request]);
}

async function runHostileSequence(page: Page, key: string) {
	const entry = entryOf(page, key);
	await restoreThenCancel(page, entry);
	for (const each of Object.values(page.entries)) {
		await expectServerValue(each);
	}

	await reload(page);
	await expectNothingOpen(page);
	await expectServerValue(entry);

	await expireOnSave(page, entry);
	await expectRestored(page, entry);
	await entry.submit();
	const { focusAfterSave } = entry;
	if (focusAfterSave) {
		await waitFor(async () => expect(await focusAfterSave()).toHaveFocus());
	}
	await entry.afterSave?.();
	await entry.exit?.();
	await expectNothingOpen(page);
	expect(page.server.writes).toEqual([
		entry.request,
		entry.request,
		entry.request,
	]);
	await reload(page);
	await expectNothingOpen(page);
}

async function runStaleRestore(page: Page, key: string) {
	const entry = entryOf(page, key);
	const { staleRestore } = entry;
	if (!staleRestore) throw new Error(`no stale restore ${key}`);
	renderAt(page.path);
	await page.ready();
	await entry.open();
	await entry.fill();
	page.server.expireNextWrite();
	await entry.submit();
	await screen.findByLabelText("E-mail");
	staleRestore.saveElsewhere();
	await signInAgain();
	await page.ready();
	await expectRestored(page, entry);

	await entry.submit();

	await staleRestore.expectChangedAlert();
	await entry.expectTyped();
	expect(staleRestore.sentVersions()).toEqual([1]);
	expect(page.server.writes).toEqual([entry.request, entry.request]);
}

async function runOtherAccount(page: Page, key: string) {
	const entry = entryOf(page, key);
	renderAt(page.path);
	await page.ready();
	await entry.open();
	await entry.fill();
	page.server.expireNextWrite();
	await entry.submit();
	page.server.signInNext(otherAccount);
	await signInAgain(otherAccount);
	await page.ready();
	if (entry.openedByAddress) {
		await entry.expectCurrent();
		await entry.cancel();
	} else {
		await expectNothingOpen(page);
		await expectServerValue(entry);
	}

	await signOut(otherAccount);
	page.server.signInNext(signedIn);
	await signInAgain();
	await reload(page);
	await expectNothingOpen(page);
	expect(page.server.writes).toEqual([entry.request]);
}

async function runPlainFocus(page: Page, key: string) {
	const entry = entryOf(page, key);
	const { focusAfterSave } = entry;
	const focusAfterCancel =
		entry.focusAfterPlainCancel ?? entry.focusAfterCancel;
	if (!focusAfterCancel || !focusAfterSave) throw new Error(`no focus ${key}`);
	renderAt(page.path);
	await page.ready();
	await entry.open();
	await entry.cancel();
	await waitFor(async () => expect(await focusAfterCancel()).toHaveFocus());
	await entry.exit?.();
	await entry.open();
	await entry.fill();
	await entry.submit();
	await waitFor(async () => expect(await focusAfterSave()).toHaveFocus());
	expect(page.server.writes).toEqual([entry.request]);
}

const ADMIN_PROJECT: ProjectSummary = {
	...project(3, "admin"),
	name: "Casa Moinhos",
	units: { reserved: 2, used: 2 },
};

const SAVE = click("button", "Salvar");
const CANCEL = click("button", "Cancelar");

function newDisciplineEntry(base: string): Entry {
	const name = textField("Nome", "Gesso", "");
	const everywhere = () => screen.findByRole("radio", { name: "Na obra toda" });
	return {
		open: click("button", "Nova disciplina"),
		fill: async () => {
			await name.fill();
			await user.click(await everywhere());
		},
		expectTyped: async () => {
			await name.expectTyped();
			expect(await everywhere()).toBeChecked();
		},
		expectCurrent: async () => {
			await name.expectCurrent();
			expect(await everywhere()).not.toBeChecked();
		},
		submit: click("button", "Criar"),
		cancel: CANCEL,
		shows: ["Nova disciplina"],
		focusAfterCancel: byRole("button", "Nova disciplina"),
		focusAfterSave: byRole("button", "Nova disciplina"),
		request: `POST ${base}/disciplines`,
	};
}

async function closeBatch() {
	const batch = screen.queryByRole("dialog", { name: "Disciplinas em lote" });
	if (batch) {
		await user.click(within(batch).getByRole("button", { name: "Cancelar" }));
	}
}

function newDisciplineInBatchEntry(base: string, opener: string): Entry {
	return {
		...newDisciplineEntry(base),
		open: async () => {
			await click("button", opener)();
			await click("button", "Nova disciplina")();
		},
		exit: closeBatch,
	};
}

function reservationEntry(
	open: () => Promise<void>,
	opener: () => Promise<HTMLElement>,
	afterSave: () => Promise<HTMLElement>,
	shows: string[],
	exit?: () => Promise<void>,
): Entry {
	return {
		open,
		...textField("Unidades reservadas", "5", "2"),
		submit: SAVE,
		cancel: CANCEL,
		...(exit && { exit }),
		shows,
		focusAfterCancel: opener,
		focusAfterSave: afterSave,
		request: `PATCH /api/projects/${ADMIN_PROJECT.id}/units`,
	};
}

function floorPage(remaining: number): Page {
	const ninth = floor("9º andar", ["901", "902"], ["Hall"]);
	const towerA = tower("Torre A", [ninth]);
	const [unit901, unit902] = ninth.units;
	const [hall] = ninth.commonAreas;
	if (!unit901 || !unit902 || !hall) throw new Error("fixture");
	const structure = structureOf([towerA]);
	const details: Record<string, Partial<LocationDetail>> = {};
	const api = writableApi(ADMIN_PROJECT, structure, { remaining, details });
	const server = expiringServer(
		combine(
			catalogApi(ADMIN_PROJECT.id, structure, details).handler,
			api.handler,
		),
	);
	const base = `/api/projects/${ADMIN_PROJECT.id}`;
	const nth = (index: number) => async () => {
		const buttons = await screen.findAllByRole("button", {
			name: "Alterar reserva",
		});
		const button = buttons[index];
		if (!button) throw new Error(`no Alterar reserva ${index}`);
		return button;
	};
	const insideDuplicate = (title: string) => async () =>
		within(
			await screen.findByRole("dialog", { name: title, hidden: true }),
		).findByRole("button", { name: "Alterar reserva", hidden: true });
	const entries: Record<string, Entry> = {
		renameFloor: {
			open: () => pick("Ações do andar", "Renomear andar"),
			...textField("Nome", "Andar 9A", "9º andar"),
			submit: SAVE,
			cancel: CANCEL,
			shows: ["Renomear o andar"],
			focusAfterCancel: byRole("button", "Ações do andar"),
			focusAfterSave: byRole("button", "Ações do andar"),
			request: `PATCH ${base}/locations/${ninth.id}`,
		},
		renameUnit: {
			open: () => pick("Ações da unidade 902", "Renomear"),
			...textField("Nome", "950", "902"),
			submit: SAVE,
			cancel: CANCEL,
			shows: ["Renomear a unidade"],
			focusAfterCancel: byRole("button", "Ações da unidade 902"),
			focusAfterSave: byRole("button", "Ações da unidade 950"),
			request: `PATCH ${base}/locations/${unit902.id}`,
		},
		renameArea: {
			open: () => pick("Ações da área comum Hall", "Renomear"),
			...textField("Nome", "Lobby", "Hall"),
			submit: SAVE,
			cancel: CANCEL,
			shows: ["Renomear a área comum"],
			focusAfterCancel: byRole("button", "Ações da área comum Hall"),
			focusAfterSave: byRole("button", "Ações da área comum Lobby"),
			request: `PATCH ${base}/locations/${hall.id}`,
		},
		newDiscipline: newDisciplineEntry(base),
		newDisciplineInBatch: newDisciplineInBatchEntry(
			base,
			"Aplicar às unidades e áreas comuns",
		),
	};
	if (remaining > 0) {
		Object.assign(entries, {
			duplicateFloor: {
				open: () => pick("Ações do andar", "Duplicar andar"),
				...textField("Nome", "Andar 9B", "10º andar"),
				submit: click("button", "Duplicar"),
				cancel: CANCEL,
				shows: ["Duplicar o 9º andar"],
				focusAfterCancel: byRole("button", "Ações do andar"),
				focusAfterSave: byRole("button", "Ações do andar"),
				request: `POST ${base}/structure`,
			},
			duplicateUnit: {
				open: () => pick("Ações da unidade 901", "Duplicar unidade"),
				...textField("Nome", "960", "903"),
				submit: click("button", "Duplicar"),
				cancel: CANCEL,
				shows: ["Duplicar a unidade 901"],
				focusAfterCancel: byRole("button", "Ações da unidade 901"),
				focusAfterSave: byRole("button", "Ações da unidade 901"),
				request: `POST ${base}/structure`,
			},
			addUnit: {
				open: click("button", "Adicionar unidade"),
				...textField("Adicionar unidade", "950", "903"),
				submit: submitBeside("Adicionar unidade", "Adicionar"),
				cancel: CANCEL,
				shows: ["Adicionar unidade"],
				focusAfterCancel: byRole("button", "Adicionar unidade"),
				focusAfterSave: byRole("button", "Adicionar unidade"),
				request: `POST ${base}/structure`,
			},
			addArea: {
				open: click("button", "Adicionar área comum"),
				...textField("Adicionar área comum", "Depósito", ""),
				submit: submitBeside("Adicionar área comum", "Adicionar"),
				cancel: CANCEL,
				shows: ["Adicionar área comum"],
				focusAfterCancel: byRole("button", "Adicionar área comum"),
				focusAfterSave: byRole("button", "Adicionar área comum"),
				request: `POST ${base}/structure`,
			},
		} satisfies Record<string, Entry>);
	} else {
		Object.assign(entries, {
			duplicateFloorReservation: reservationEntry(
				async () => {
					await pick("Ações do andar", "Duplicar andar");
					await (await insideDuplicate("Duplicar o 9º andar")()).click();
				},
				insideDuplicate("Duplicar o 9º andar"),
				byRole("dialog", "Duplicar o 9º andar"),
				["Duplicar o 9º andar", "Alterar reserva"],
				pressEscape,
			),
			duplicateUnitReservation: reservationEntry(
				async () => {
					await pick("Ações da unidade 901", "Duplicar unidade");
					await (await insideDuplicate("Duplicar a unidade 901")()).click();
				},
				insideDuplicate("Duplicar a unidade 901"),
				byRole("dialog", "Duplicar a unidade 901"),
				["Duplicar a unidade 901", "Alterar reserva"],
				pressEscape,
			),
			unitRowReservation: reservationEntry(
				async () => (await nth(0)()).click(),
				nth(0),
				byRole("button", "Adicionar unidade"),
				["Alterar reserva"],
			),
			areaRowReservation: reservationEntry(
				async () => (await nth(1)()).click(),
				nth(1),
				byRole("button", "Adicionar área comum"),
				["Alterar reserva"],
			),
		} satisfies Record<string, Entry>);
	}
	return {
		path: `/projects/${ADMIN_PROJECT.id}/locations/${ninth.id}`,
		ready: () =>
			screen.findByRole("button", { name: "Ações do andar", hidden: true }),
		inline: ["Adicionar unidade", "Adicionar área comum"],
		entries,
		server,
	};
}

function roomsPage(holder: "unit" | "area", remaining: number): Page {
	const ninth = floor(
		"9º andar",
		[{ name: "903", typology: "Tipologia A", changes: 1 }],
		[{ name: "Hall", typology: "Hall padrão" }],
	);
	const towerA = tower("Torre A", [ninth]);
	const structure = structureOf([towerA]);
	const located = holder === "unit" ? ninth.units[0] : ninth.commonAreas[0];
	if (!located) throw new Error("fixture");
	const typeA = typologyOf("Tipologia A", ["Sala", "Cozinha"]);
	const typeB = typologyOf("Tipologia B", ["Suíte"]);
	const hallPadrao = typologyOf("Hall padrão", ["Sala", "Cozinha"], {
		locationType: "common_area",
	});
	const corredor = typologyOf("Corredor", ["Circulação"], {
		locationType: "common_area",
	});
	const typologies = [typeA, hallPadrao, typeB, corredor];
	const [current, other] =
		holder === "unit" ? [typeA, typeB] : [hallPadrao, corredor];
	const sala = room("Sala", { fromType: true });
	const lavanderia = room("Lavanderia");
	const own: Partial<LocationDetail> = {
		rooms: [sala, lavanderia],
		droppedRooms: [droppedRoom("Cozinha")],
		changes: 1,
	};
	const details: Record<string, Partial<LocationDetail>> = {
		[located.id]: own,
	};
	const base = `/api/projects/${ADMIN_PROJECT.id}`;
	const detail = () => json(locationIn(structure, located.id, details));
	const rooms = (url: URL, init?: RequestInit) => {
		const method = init?.method ?? "GET";
		const body = init?.body
			? (JSON.parse(String(init.body)) as Record<string, unknown>)
			: {};
		if (
			method === "POST" &&
			url.pathname === `${base}/locations/${located.id}/rooms`
		) {
			own.rooms = [
				...(own.rooms ?? []),
				{
					id: String(body.id),
					name: String(body.name),
					typologyRoomId: null,
					renamed: false,
				},
			];
			return detail();
		}
		const roomPath = new RegExp(`^${base}/rooms/([^/]+)$`).exec(url.pathname);
		if (roomPath && method === "PATCH") {
			own.rooms = (own.rooms ?? []).map((each) =>
				each.id === roomPath[1] ? { ...each, name: String(body.name) } : each,
			);
			return detail();
		}
		if (roomPath && method === "DELETE") {
			own.rooms = (own.rooms ?? []).filter((each) => each.id !== roomPath[1]);
			return detail();
		}
		if (
			method === "DELETE" &&
			url.pathname.startsWith(`${base}/locations/${located.id}/dropped-rooms/`)
		) {
			own.droppedRooms = [];
			return detail();
		}
		if (
			method === "POST" &&
			url.pathname === `${base}/locations/${located.id}/typology/reset`
		) {
			own.changes = 0;
			return detail();
		}
		if (
			method === "PUT" &&
			url.pathname === `${base}/locations/${located.id}/typology`
		) {
			const chosen = typologies.find((each) => each.id === body.typologyId);
			own.typology = chosen ? { id: chosen.id, name: chosen.name } : null;
			return detail();
		}
		return undefined;
	};
	const api = writableApi(ADMIN_PROJECT, structure, { remaining, details });
	const server = expiringServer(
		combine(
			rooms,
			typologiesApi(ADMIN_PROJECT.id, { typologies }),
			catalogApi(ADMIN_PROJECT.id, structure, details).handler,
			api.handler,
		),
	);
	const pageMenu =
		holder === "unit" ? "Ações da unidade" : "Ações da área comum";
	const entries: Record<string, Entry> = {
		rename: {
			open: () => pick(pageMenu, "Renomear"),
			...textField("Nome", holder === "unit" ? "950" : "Lobby", located.name),
			submit: SAVE,
			cancel: CANCEL,
			shows: [
				holder === "unit" ? "Renomear a unidade" : "Renomear a área comum",
			],
			focusAfterCancel: byRole("button", pageMenu),
			focusAfterSave: byRole("button", pageMenu),
			request: `PATCH ${base}/locations/${located.id}`,
		},
		addRoom: {
			open: click("button", "Adicionar cômodo"),
			...textField("Adicionar cômodo", "Copa", "", "combobox"),
			expectTyped: async () => {
				expect(
					await screen.findByRole("combobox", { name: "Adicionar cômodo" }),
				).toHaveValue("Copa");
				expect(screen.queryByRole("listbox")).toBeNull();
			},
			submit: submitBeside("Adicionar cômodo", "Adicionar"),
			cancel: click("button", "Fechar"),
			shows: ["Adicionar cômodo"],
			focusAfterCancel: byRole("button", "Adicionar cômodo"),
			focusAfterSave: byRole("combobox", "Adicionar cômodo"),
			afterSave: click("button", "Fechar"),
			request: `POST ${base}/locations/${located.id}/rooms`,
		},
		renameRoom: {
			open: () => pick("Ações do cômodo Lavanderia", "Renomear"),
			...textField("Nome", "Área de serviço", "Lavanderia"),
			submit: SAVE,
			cancel: CANCEL,
			shows: ["Renomear o cômodo"],
			focusAfterCancel: byRole("button", "Ações do cômodo Lavanderia"),
			focusAfterSave: byRole("button", "Ações do cômodo Área de serviço"),
			request: `PATCH ${base}/rooms/${lavanderia.id}`,
		},
		newDiscipline: newDisciplineEntry(base),
		newDisciplineInBatch: newDisciplineInBatchEntry(
			base,
			"Aplicar a outros locais",
		),
	};
	if (remaining > 0) {
		const radio = (name: string) => () =>
			screen.findByRole("radio", { name: new RegExp(`^${name}`) });
		entries.changeTypology = {
			open: click("button", "Trocar tipologia"),
			fill: async () => user.click(await radio(other.name)()),
			expectTyped: async () => expect(await radio(other.name)()).toBeChecked(),
			expectCurrent: async () =>
				expect(await radio(current.name)()).toBeChecked(),
			submit: click("button", "Trocar"),
			cancel: CANCEL,
			shows: [
				holder === "unit"
					? "Trocar a tipologia da 903"
					: "Trocar a tipologia da área comum Hall",
			],
			focusAfterCancel: byRole("button", "Trocar tipologia"),
			focusAfterSave: byRole("button", "Trocar tipologia"),
			request: `PUT ${base}/locations/${located.id}/typology`,
		};
	}
	if (holder === "unit" && remaining > 0) {
		Object.assign(entries, {
			duplicate: {
				open: () => pick(pageMenu, "Duplicar unidade"),
				...textField("Nome", "960", "904"),
				submit: click("button", "Duplicar"),
				cancel: CANCEL,
				shows: ["Duplicar a unidade 903"],
				focusAfterCancel: byRole("button", pageMenu),
				focusAfterSave: byRole("button", pageMenu),
				request: `POST ${base}/structure`,
			},
		} satisfies Record<string, Entry>);
	}
	if (holder === "unit" && remaining === 0) {
		const duplicate = async () =>
			screen.findByRole("dialog", {
				name: "Duplicar a unidade 903",
				hidden: true,
			});
		const alter = async () =>
			within(await duplicate()).findByRole("button", {
				name: "Alterar reserva",
				hidden: true,
			});
		entries.duplicateReservation = reservationEntry(
			async () => {
				await pick(pageMenu, "Duplicar unidade");
				await user.click(await alter());
			},
			alter,
			duplicate,
			["Duplicar a unidade 903", "Alterar reserva"],
			pressEscape,
		);
	}
	return {
		path: `/projects/${ADMIN_PROJECT.id}/locations/${located.id}`,
		ready: () => screen.findByRole("button", { name: pageMenu, hidden: true }),
		inline: ["Adicionar cômodo"],
		entries,
		server,
	};
}

function towerPage(remaining: number): Page {
	const towerA = tower(
		"Torre A",
		[floor("1º andar", ["101", "102"])],
		["Piscina"],
	);
	const [piscina] = towerA.commonAreas;
	if (!piscina) throw new Error("fixture");
	const structure = structureOf([towerA]);
	const details: Record<string, Partial<LocationDetail>> = {};
	const api = writableApi(ADMIN_PROJECT, structure, { remaining, details });
	const server = expiringServer(
		combine(
			catalogApi(ADMIN_PROJECT.id, structure, details).handler,
			api.handler,
		),
	);
	const base = `/api/projects/${ADMIN_PROJECT.id}`;
	const entries: Record<string, Entry> = {
		renameTower: {
			open: () => pick("Ações da torre", "Renomear torre"),
			...textField("Nome", "Torre Norte", "Torre A"),
			submit: SAVE,
			cancel: CANCEL,
			shows: ["Renomear a torre"],
			focusAfterCancel: byRole("button", "Ações da torre"),
			focusAfterSave: byRole("button", "Ações da torre"),
			request: `PATCH ${base}/locations/${towerA.id}`,
		},
		renameArea: {
			open: () => pick("Ações da área comum Piscina", "Renomear"),
			...textField("Nome", "Academia", "Piscina"),
			submit: SAVE,
			cancel: CANCEL,
			shows: ["Renomear a área comum"],
			focusAfterCancel: byRole("button", "Ações da área comum Piscina"),
			focusAfterSave: byRole("button", "Ações da área comum Academia"),
			request: `PATCH ${base}/locations/${piscina.id}`,
		},
		newDiscipline: newDisciplineEntry(base),
		newDisciplineInBatch: newDisciplineInBatchEntry(
			base,
			"Aplicar às unidades e áreas comuns",
		),
	};
	if (remaining > 0) {
		Object.assign(entries, {
			duplicateTower: {
				open: () => pick("Ações da torre", "Duplicar torre"),
				...textField("Nome", "Torre Z", "Torre B"),
				submit: click("button", "Duplicar"),
				cancel: CANCEL,
				shows: ["Duplicar a Torre A"],
				focusAfterCancel: byRole("button", "Ações da torre"),
				focusAfterSave: byRole("button", "Ações da torre"),
				request: `POST ${base}/structure`,
			},
			addArea: {
				open: click("button", "Adicionar área comum"),
				...textField("Adicionar área comum", "Academia", ""),
				submit: submitBeside("Adicionar área comum", "Adicionar"),
				cancel: CANCEL,
				shows: ["Adicionar área comum"],
				focusAfterCancel: byRole("button", "Adicionar área comum"),
				focusAfterSave: byRole("button", "Adicionar área comum"),
				request: `POST ${base}/structure`,
			},
			addAreaFromMenu: {
				open: () => pick("Ações da torre", "Adicionar área comum"),
				...textField("Adicionar área comum", "Academia", ""),
				submit: submitBeside("Adicionar área comum", "Adicionar"),
				cancel: CANCEL,
				shows: ["Adicionar área comum"],
				focusAfterCancel: byRole("button", "Ações da torre"),
				focusAfterSave: byRole("button", "Ações da torre"),
				request: `POST ${base}/structure`,
			},
		} satisfies Record<string, Entry>);
	} else {
		const duplicate = async () =>
			screen.findByRole("dialog", { name: "Duplicar a Torre A", hidden: true });
		const alter = async () =>
			within(await duplicate()).findByRole("button", {
				name: "Alterar reserva",
				hidden: true,
			});
		Object.assign(entries, {
			duplicateReservation: reservationEntry(
				async () => {
					await pick("Ações da torre", "Duplicar torre");
					await user.click(await alter());
				},
				alter,
				duplicate,
				["Duplicar a Torre A", "Alterar reserva"],
				pressEscape,
			),
			areaRowReservation: reservationEntry(
				click("button", "Alterar reserva"),
				byRole("button", "Alterar reserva"),
				byRole("button", "Adicionar área comum"),
				["Alterar reserva"],
			),
		} satisfies Record<string, Entry>);
	}
	return {
		path: `/projects/${ADMIN_PROJECT.id}/locations/${towerA.id}`,
		ready: () =>
			screen.findByRole("button", { name: "Ações da torre", hidden: true }),
		inline: ["Adicionar área comum"],
		entries,
		server,
	};
}

function facadePage(state: "free" | "exhausted" | "blank"): Page {
	const structure =
		state === "blank"
			? structureOf([])
			: structureOf(
					[tower("Torre A", [floor("1º andar", ["101"])]), tower("Torre B")],
					["Guarita"],
				);
	const guarita = structure.commonAreas[0];
	const api = writableApi(ADMIN_PROJECT, structure, {
		remaining: state === "exhausted" ? 0 : 100,
	});
	const server = expiringServer(api.handler);
	const base = `/api/projects/${ADMIN_PROJECT.id}`;
	const path = `/projects/${ADMIN_PROJECT.id}`;
	if (state === "blank") {
		return {
			path,
			ready: () => screen.findByRole("heading", { level: 1, hidden: true }),
			inline: ["Nome da torre"],
			entries: {
				addTower: {
					open: click("button", "Adicionar uma torre por vez"),
					...textField("Nome da torre", "Torre Z", "Torre A"),
					submit: submitBeside("Nome da torre", "Adicionar"),
					cancel: CANCEL,
					shows: ["Nome da torre"],
					focusAfterCancel: byRole("button", "Adicionar uma torre por vez"),
					focusAfterSave: byRole("button", "Adicionar"),
					request: `POST ${base}/structure`,
				},
			},
			server,
		};
	}
	if (!guarita) throw new Error("fixture");
	const entries: Record<string, Entry> = {
		addTower: {
			open: () => pick("Adicionar", "Torre"),
			...textField("Nome da torre", "Torre Z", "Torre C"),
			submit: submitBeside("Nome da torre", "Adicionar"),
			cancel: CANCEL,
			shows: ["Nome da torre"],
			focusAfterCancel: byRole("button", "Adicionar"),
			focusAfterSave: byRole("button", "Adicionar"),
			request: `POST ${base}/structure`,
		},
		renameArea: {
			open: () => pick("Ações da área comum Guarita", "Renomear"),
			...textField("Nome", "Portaria", "Guarita"),
			submit: SAVE,
			cancel: CANCEL,
			shows: ["Renomear a área comum"],
			focusAfterCancel: byRole("button", "Ações da área comum Guarita"),
			focusAfterSave: byRole("button", "Ações da área comum Portaria"),
			request: `PATCH ${base}/locations/${guarita.id}`,
		},
	};
	if (state === "free") {
		Object.assign(entries, {
			addArea: {
				open: click("button", "Adicionar área comum"),
				...textField("Adicionar área comum", "Portaria", ""),
				submit: submitBeside("Adicionar área comum", "Adicionar"),
				cancel: CANCEL,
				shows: ["Adicionar área comum"],
				focusAfterCancel: byRole("button", "Adicionar área comum"),
				focusAfterSave: byRole("button", "Adicionar área comum"),
				request: `POST ${base}/structure`,
			},
			addAreaFromMenu: {
				open: () => pick("Adicionar", "Área comum da obra"),
				...textField("Adicionar área comum", "Portaria", ""),
				submit: submitBeside("Adicionar área comum", "Adicionar"),
				cancel: CANCEL,
				shows: ["Adicionar área comum"],
				focusAfterCancel: byRole("button", "Adicionar"),
				focusAfterSave: byRole("button", "Adicionar"),
				request: `POST ${base}/structure`,
			},
		} satisfies Record<string, Entry>);
	} else {
		entries.areaRowReservation = reservationEntry(
			click("button", "Alterar reserva"),
			byRole("button", "Alterar reserva"),
			byRole("button", "Adicionar área comum"),
			["Alterar reserva"],
		);
	}
	return {
		path,
		ready: () => screen.findByRole("heading", { name: "Torres", hidden: true }),
		inline: ["Nome da torre", "Adicionar área comum"],
		entries,
		server,
	};
}

function configurationPage(): Page {
	const api = writableApi(ADMIN_PROJECT, structureOf([]), { remaining: 0 });
	const base = `/api/projects/${ADMIN_PROJECT.id}`;
	const typeA = typologyOf("Tipologia A", ["Sala"]);
	const typologies = typologyServer(ADMIN_PROJECT.id, [typeA]);
	const changedAlert = async () => {
		await screen.findByText("A Tipologia A mudou");
	};
	const staleRestore = {
		saveElsewhere: () =>
			typologies.saveElsewhere(typeA.id, {
				rooms: [...typeA.rooms, { id: uuidV7(), name: "Cozinha" }],
			}),
		expectChangedAlert: changedAlert,
		sentVersions: () =>
			typologies.writes.map(
				({ body }) => (body as { version: unknown }).version,
			),
	};
	const renameProject = (url: URL, init?: RequestInit) => {
		if (url.pathname !== base || init?.method !== "PATCH") return undefined;
		const body = JSON.parse(String(init.body)) as { name: string };
		api.state.summary = { ...api.state.summary, name: body.name };
		return json(api.state.summary);
	};
	const server = expiringServer(
		combine(
			renameProject,
			typologies.handler,
			structureApi(ADMIN_PROJECT.id, structureOf([])),
			api.handler,
		),
	);
	const tags = () => screen.queryAllByRole("button", { name: /^Tirar / });
	return {
		path: `/projects/${ADMIN_PROJECT.id}/configuration`,
		ready: () =>
			screen.findByRole("heading", { name: "Dados da obra", hidden: true }),
		inline: ["Nome da obra", "Novo cômodo"],
		entries: {
			renameProject: {
				open: click("button", "Renomear"),
				...textField("Nome da obra", "Casa Nova", "Casa Moinhos"),
				submit: SAVE,
				cancel: CANCEL,
				shows: ["Nome da obra"],
				focusAfterCancel: byRole("button", "Renomear"),
				focusAfterSave: byRole("button", "Renomear"),
				request: `PATCH ${base}`,
			},
			reservation: {
				...reservationEntry(
					click("button", "Alterar reserva"),
					byRole("button", "Alterar reserva"),
					byRole("button", "Alterar reserva"),
					["Alterar reserva"],
				),
				openedByAddress: true,
			},
			createTypology: {
				open: click("button", "Nova tipologia"),
				...textField("Nome", "Tipologia C", ""),
				submit: click("button", "Criar"),
				cancel: CANCEL,
				shows: ["Nova tipologia"],
				focusAfterCancel: byRole("button", "Nova tipologia"),
				focusAfterSave: byRole("combobox", "Novo cômodo da Tipologia C"),
				afterSave: CANCEL,
				request: `POST ${base}/typologies`,
			},
			createCommonAreaTypology: {
				open: click("button", "Nova tipologia de área comum"),
				...textField("Nome", "Corredor", ""),
				submit: click("button", "Criar"),
				cancel: CANCEL,
				shows: ["Nova tipologia de área comum"],
				focusAfterCancel: byRole("button", "Nova tipologia de área comum"),
				focusAfterSave: byRole("combobox", "Novo cômodo da Corredor"),
				afterSave: CANCEL,
				request: `POST ${base}/typologies`,
			},
			renameTypology: {
				open: () => pick("Ações da Tipologia A", "Renomear"),
				...textField("Nome", "Tipologia Z", "Tipologia A"),
				submit: SAVE,
				cancel: CANCEL,
				shows: ["Renomear a tipologia"],
				focusAfterCancel: byRole("button", "Ações da Tipologia A"),
				focusAfterSave: byRole("button", "Ações da Tipologia Z"),
				request: `PATCH ${base}/typologies/${typeA.id}`,
				staleRestore,
			},
			copyTypology: {
				open: () => pick("Ações da Tipologia A", "Copiar"),
				...textField("Nome da cópia", "Tipologia Z", "Tipologia A (cópia)"),
				submit: click("button", "Copiar"),
				cancel: CANCEL,
				shows: ["Copiar Tipologia A"],
				focusAfterCancel: byRole("button", "Ações da Tipologia A"),
				focusAfterSave: () =>
					screen.findByRole("button", { name: /^Tipologia Z/ }),
				request: `POST ${base}/typologies`,
			},
			editRooms: {
				open: () => pick("Ações da Tipologia A", "Editar cômodos"),
				fill: async () => {
					await user.type(
						await screen.findByRole("combobox", {
							name: "Novo cômodo da Tipologia A",
						}),
						"Lavabo{Enter}",
					);
					await user.click(
						await screen.findByRole("button", { name: "Tirar Sala" }),
					);
				},
				expectTyped: async () => {
					await screen.findByRole("combobox", {
						name: "Novo cômodo da Tipologia A",
					});
					expect(tags().map((tag) => tag.getAttribute("aria-label"))).toEqual([
						"Tirar Lavabo",
					]);
					expect(screen.getByText("Novo")).toBeInTheDocument();
					for (const create of [
						"Nova tipologia",
						"Nova tipologia de área comum",
					]) {
						expect(
							screen.getByRole("button", { name: create }),
						).toHaveAttribute("aria-disabled", "true");
					}
				},
				expectCurrent: async () => {
					await screen.findByRole("combobox", {
						name: "Novo cômodo da Tipologia A",
					});
					expect(tags().map((tag) => tag.getAttribute("aria-label"))).toEqual([
						"Tirar Sala",
					]);
				},
				submit: SAVE,
				cancel: CANCEL,
				shows: ["Novo cômodo"],
				focusAfterCancel: byRole("button", "Ações da Tipologia A"),
				focusAfterSave: byRole("button", "Ações da Tipologia A"),
				request: `PATCH ${base}/typologies/${typeA.id}`,
				staleRestore,
			},
		},
		server,
	};
}

function newProjectPage(): Page {
	const created = { ...project(9, "admin"), name: "Casa Nova" };
	const server = expiringServer(
		(url, init) => {
			if (url.pathname === "/api/projects" && init?.method === "POST") {
				return json(created, 201);
			}
			if (url.pathname === `/api/projects/${created.id}`) return json(created);
			if (url.pathname === "/api/organization/units") {
				return json({
					contracted: 500,
					reserved: 300,
					free: 200,
					reclaimable: 0,
				});
			}
			return undefined;
		},
		{ organization: { ...organization, role: "admin" } },
	);
	const path = "/projects/new";
	return {
		path,
		ready: () =>
			screen.findByRole("textbox", { name: "Nome da obra", hidden: true }),
		inline: [],
		entries: {
			createProject: {
				open: async () => {},
				...textField("Nome da obra", "Casa Nova", ""),
				fill: async () => {
					await textField("Nome da obra", "Casa Nova", "").fill();
					await textField("Unidades reservadas", "12", "").fill();
				},
				submit: click("button", "Criar obra"),
				cancel: async () => {
					await user.click(await screen.findByRole("link", { name: "Obras" }));
					await screen.findByRole("heading", { name: "Obras", hidden: true });
				},
				reenter: async () => {
					cleanup();
					renderAt(path);
					await screen.findByRole("textbox", { name: "Nome da obra" });
				},
				shows: [],
				request: "POST /api/projects",
			},
		},
		server,
	};
}

function unitsPage(): Page {
	const aurora = "0190a000-0000-7000-8000-00000000000a";
	let reservations: OrganizationReservations = {
		items: [
			{ projectId: aurora, name: "Edifício Aurora", reserved: 300, used: 180 },
		],
		delivered: { projects: 0, used: 0 },
	};
	const server = expiringServer(
		(url, init) => {
			if (url.pathname === "/api/organization/units/reservations") {
				if (init?.method === "PATCH") {
					const { items } = JSON.parse(String(init.body)) as {
						items: { projectId: string; reserved: number }[];
					};
					reservations = {
						...reservations,
						items: reservations.items.map((row) => ({
							...row,
							reserved:
								items.find((item) => item.projectId === row.projectId)
									?.reserved ?? row.reserved,
						})),
					};
				}
				return json(reservations);
			}
			if (url.pathname === "/api/organization/units") {
				return json({
					contracted: 2000,
					reserved: 300,
					free: 1700,
					reclaimable: 120,
				});
			}
			return undefined;
		},
		{ organization: { ...organization, role: "admin" } },
	);
	return {
		path: "/units",
		ready: () =>
			screen.findByRole("textbox", {
				name: "Reserva de Edifício Aurora",
				hidden: true,
			}),
		inline: [],
		entries: {
			reservations: {
				open: async () => {},
				...textField("Reserva de Edifício Aurora", "320", "300"),
				submit: click("button", "Salvar"),
				cancel: async () => {
					const discard = screen.queryByRole("button", { name: "Descartar" });
					if (discard) await user.click(discard);
				},
				shows: [],
				request: "PATCH /api/organization/units/reservations",
			},
		},
		server,
	};
}

function wizardPage(adding: boolean, remaining: number): Page {
	const summary: ProjectSummary = {
		...ADMIN_PROJECT,
		units: { reserved: 150, used: 150 - remaining },
	};
	const towerB = tower("Torre B", [
		floor("1º andar", ["101", "102"]),
		floor("2º andar", ["201", "202"]),
	]);
	const api = writableApi(summary, structureOf(adding ? [towerB] : []), {
		remaining,
	});
	const server = expiringServer(
		combine(typologiesApi(summary.id, { typologies: [] }), api.handler),
	);
	const path = adding
		? `/projects/${summary.id}/structure/new?tower=${towerB.id}`
		: `/projects/${summary.id}/structure/new`;
	const createLabel = adding
		? /^Adicionar( \d+)? andares?$/
		: /^Criar estrutura$/;
	const createButton = () => screen.findByRole("button", { name: createLabel });
	const leaveAndReturn = {
		cancel: async () => {
			const hasDraft =
				localStorage.getItem(
					structureDraftKey(
						signedIn.user.id,
						summary.id,
						adding ? towerB.id : undefined,
					),
				) !== null;
			await user.click(
				await screen.findByRole("link", { name: "Casa Moinhos" }),
			);
			if (hasDraft)
				await user.click(
					await screen.findByRole("button", { name: "Descartar" }),
				);
			await waitFor(() =>
				expect(
					screen.queryByRole("textbox", { name: "Último andar" }),
				).toBeNull(),
			);
		},
		reenter: async () => {
			cleanup();
			renderAt(path);
			await screen.findByRole("textbox", { name: "Último andar" });
		},
	};
	const textbox =
		(name: string, at = 0) =>
		async () =>
			(await screen.findAllByRole("textbox", { name }))[at];
	const typeIn = async (name: string, value: string, at = 0) => {
		const field = await textbox(name, at)();
		if (!field) throw new Error(`no ${name} ${at}`);
		await user.clear(field);
		await user.type(field, value);
	};
	const valuesOf = async (name: string) =>
		(await screen.findAllByRole("textbox", { name })).map(
			(field) => (field as HTMLInputElement).value,
		);
	const fillTower = async () => {
		if (adding) {
			await typeIn("Último andar", "5");
			await typeIn("Finais", "01, 03");
			return;
		}
		await user.click(await screen.findByRole("radio", { name: "1A, 1B" }));
		await typeIn("Primeiro andar", "2");
		await typeIn("Último andar", "4");
		await typeIn("Finais", "a, d");
		await user.click(await screen.findByRole("button", { name: "Faixa" }));
		await typeIn("Último andar", "6", 1);
		await typeIn("Finais", "B", 1);
		await user.click(await screen.findByRole("button", { name: "Faixa" }));
		await typeIn("Último andar", "7", 2);
		const leisure = (
			await screen.findAllByRole("checkbox", { name: "Andares sem unidades" })
		)[2];
		if (!leisure) throw new Error("no third range");
		await user.click(leisure);
	};
	const overReserve = async () => {
		if (!adding) await typeIn("Primeiro andar", "1");
		await typeIn("Último andar", "5");
		await typeIn("Finais", "01, 03");
	};
	const describeTower: Pick<Entry, "fill" | "expectTyped" | "expectCurrent"> = {
		fill: fillTower,
		expectTyped: async () => {
			expect(
				await screen.findByText("Rascunho restaurado"),
			).toBeInTheDocument();
			if (adding) {
				expect(await valuesOf("Do andar")).toEqual(["3"]);
				expect(await valuesOf("Último andar")).toEqual(["5"]);
				expect(await valuesOf("Finais")).toEqual(["01, 03"]);
				return;
			}
			expect(await valuesOf("Primeiro andar")).toEqual(["2", "5", "7"]);
			expect(await valuesOf("Último andar")).toEqual(["4", "6", "7"]);
			expect(await valuesOf("Finais")).toEqual(["a, d", "B"]);
			expect(
				(
					await screen.findAllByRole("checkbox", {
						name: "Andares sem unidades",
					})
				).map((box) => box.getAttribute("aria-checked")),
			).toEqual(["false", "false", "true"]);
			expect(
				await screen.findByRole("radio", { name: "1A, 1B" }),
			).toBeChecked();
		},
		expectCurrent: async () => {
			expect(await valuesOf("Último andar")).toEqual([""]);
			expect(await valuesOf("Finais")).toEqual([""]);
			if (adding) {
				expect(await valuesOf("Do andar")).toEqual(["3"]);
			} else {
				expect(
					await screen.findByRole("radio", { name: "101, 102" }),
				).toBeChecked();
			}
		},
	};
	const entries: Record<string, Entry> = {};
	if (remaining > 20) {
		entries.create = {
			open: async () => {},
			...describeTower,
			submit: async () => user.click(await createButton()),
			...leaveAndReturn,
			shows: [],
			request: `POST /api/projects/${summary.id}/structure`,
			...(adding && {
				whileSignedOut: () => {
					towerB.floors.push(floor("3º andar", ["301", "302"], [], 2));
				},
				afterRestore: async () => {
					expect(
						await screen.findByText("A obra já tem o 3º andar."),
					).toBeInTheDocument();
					towerB.floors.pop();
				},
			}),
		};
	} else {
		entries.reservation = {
			open: async () => {
				await overReserve();
				await user.click(
					await screen.findByRole("button", { name: "Alterar reserva" }),
				);
			},
			...textField("Unidades reservadas", "160", "150"),
			expectTyped: async () => {
				expect(
					await screen.findByText("Rascunho restaurado", {
						selector: "[data-slot='alert-title']",
					}),
				).toBeInTheDocument();
				expect(
					await screen.findByRole("textbox", { name: "Unidades reservadas" }),
				).toHaveValue("160");
			},
			submit: SAVE,
			cancel: CANCEL,
			shows: ["Alterar reserva"],
			focusAfterCancel: byRole("button", "Alterar reserva"),
			focusAfterPlainCancel: byRole("button", "Alterar reserva"),
			focusAfterSave: createButton,
			request: `PATCH /api/projects/${summary.id}/units`,
			...(adding && {
				whileSignedOut: () => {
					towerB.floors.push(floor("3º andar", ["301", "302"], [], 2));
				},
				afterCancel: async () => {
					expect(
						await screen.findByText("A obra já tem o 3º andar."),
					).toBeInTheDocument();
					towerB.floors.pop();
				},
			}),
		};
	}
	return {
		path,
		ready: () => screen.findByRole("heading", { level: 1, hidden: true }),
		inline: [],
		entries,
		server,
	};
}

export const PAGES = {
	newProject: newProjectPage,
	units: unitsPage,
	wizard: () => wizardPage(false, 100),
	wizardExhausted: () => wizardPage(false, 6),
	addFloors: () => wizardPage(true, 100),
	addFloorsExhausted: () => wizardPage(true, 2),
	configuration: configurationPage,
	facade: () => facadePage("free"),
	facadeExhausted: () => facadePage("exhausted"),
	facadeBlank: () => facadePage("blank"),
	tower: () => towerPage(100),
	towerExhausted: () => towerPage(0),
	floor: () => floorPage(100),
	floorExhausted: () => floorPage(0),
	unit: () => roomsPage("unit", 100),
	unitExhausted: () => roomsPage("unit", 0),
	commonArea: () => roomsPage("area", 100),
};

type PageKey = keyof typeof PAGES;

const GROUP_OF_PAGE = {
	newProject: "projects",
	units: "projects",
	configuration: "projects",
	facade: "facade",
	facadeExhausted: "facade",
	facadeBlank: "facade",
	tower: "tower",
	towerExhausted: "tower",
	floor: "floor",
	floorExhausted: "floor",
	unit: "rooms",
	unitExhausted: "rooms",
	commonArea: "rooms",
	wizard: "wizard",
	wizardExhausted: "wizard",
	addFloors: "wizard",
	addFloorsExhausted: "wizard",
} as const satisfies Record<PageKey, string>;

type PageGroup = (typeof GROUP_OF_PAGE)[PageKey];

export const PAGE_GROUPS: PageGroup[] = [
	...new Set(Object.values(GROUP_OF_PAGE)),
];

function groupOfFile(fileUrl: string): PageGroup {
	const name = new URL(fileUrl).pathname.replace(/^.*\/(.*)\.test\.tsx$/, "$1");
	const group = PAGE_GROUPS.find((candidate) => candidate === name);
	if (!group) {
		throw new Error(
			`${fileUrl} names no group of screens; expected one of ${PAGE_GROUPS.join(", ")}`,
		);
	}
	return group;
}

export type Row = [
	row: number,
	page: PageKey,
	entry: string,
	kind: SessionDraftKind,
	sequence: "full" | "entry",
];

export const ROWS: Row[] = [
	[1, "newProject", "createProject", "create-project", "full"],
	[2, "units", "reservations", "update-reservations", "full"],
	[3, "configuration", "renameProject", "rename-project", "full"],
	[4, "configuration", "reservation", "change-reservation", "full"],
	[5, "configuration", "createTypology", "create-typology", "full"],
	[6, "configuration", "renameTypology", "update-typology", "entry"],
	[7, "configuration", "editRooms", "update-typology", "full"],
	[8, "facade", "addTower", "create-structure", "entry"],
	[9, "facade", "addArea", "create-structure", "entry"],
	[10, "facadeExhausted", "areaRowReservation", "change-reservation", "entry"],
	[11, "facade", "renameArea", "rename-location", "entry"],
	[12, "tower", "renameTower", "rename-location", "entry"],
	[13, "tower", "duplicateTower", "duplicate-location", "entry"],
	[14, "towerExhausted", "duplicateReservation", "change-reservation", "entry"],
	[15, "tower", "renameArea", "rename-location", "entry"],
	[16, "tower", "addArea", "create-structure", "entry"],
	[17, "towerExhausted", "areaRowReservation", "change-reservation", "entry"],
	[18, "floor", "renameFloor", "rename-location", "full"],
	[19, "floor", "duplicateFloor", "duplicate-location", "full"],
	[
		20,
		"floorExhausted",
		"duplicateFloorReservation",
		"change-reservation",
		"full",
	],
	[21, "floor", "renameUnit", "rename-location", "entry"],
	[22, "floor", "duplicateUnit", "duplicate-location", "entry"],
	[
		23,
		"floorExhausted",
		"duplicateUnitReservation",
		"change-reservation",
		"entry",
	],
	[24, "floor", "renameArea", "rename-location", "entry"],
	[25, "floor", "addUnit", "create-structure", "full"],
	[26, "floor", "addArea", "create-structure", "entry"],
	[27, "floorExhausted", "unitRowReservation", "change-reservation", "entry"],
	[28, "floorExhausted", "areaRowReservation", "change-reservation", "entry"],
	[29, "unit", "rename", "rename-location", "entry"],
	[30, "unit", "duplicate", "duplicate-location", "entry"],
	[31, "unitExhausted", "duplicateReservation", "change-reservation", "entry"],
	[32, "unit", "changeTypology", "change-typology", "full"],
	[33, "unit", "addRoom", "add-room", "full"],
	[34, "unit", "renameRoom", "rename-room", "full"],
	[35, "commonArea", "rename", "rename-location", "entry"],
	[36, "commonArea", "addRoom", "add-room", "entry"],
	[37, "commonArea", "renameRoom", "rename-room", "entry"],
	[38, "wizard", "create", "create-structure", "entry"],
	[39, "wizardExhausted", "reservation", "change-reservation", "entry"],
	[40, "addFloors", "create", "create-structure", "entry"],
	[41, "addFloorsExhausted", "reservation", "change-reservation", "entry"],
	[42, "tower", "addAreaFromMenu", "create-structure", "entry"],
	[43, "facade", "addAreaFromMenu", "create-structure", "entry"],
	[44, "facadeBlank", "addTower", "create-structure", "entry"],
	[45, "commonArea", "changeTypology", "change-typology", "entry"],
	[46, "configuration", "createCommonAreaTypology", "create-typology", "entry"],
	[47, "unit", "newDiscipline", "create-discipline", "full"],
	[48, "commonArea", "newDiscipline", "create-discipline", "entry"],
	[49, "floor", "newDiscipline", "create-discipline", "entry"],
	[50, "tower", "newDiscipline", "create-discipline", "entry"],
	[51, "configuration", "copyTypology", "copy-typology", "full"],
	[52, "floor", "newDisciplineInBatch", "create-discipline", "entry"],
	[53, "tower", "newDisciplineInBatch", "create-discipline", "entry"],
	[54, "unit", "newDisciplineInBatch", "create-discipline", "entry"],
	[55, "commonArea", "newDisciplineInBatch", "create-discipline", "entry"],
];

function rowsReturningFocus(rows: Row[]): Row[] {
	const returning = rows.filter(([, page, key]) => {
		const { focusAfterCancel, focusAfterSave } = entryOf(PAGES[page](), key);
		return focusAfterCancel !== undefined && focusAfterSave !== undefined;
	});
	vi.unstubAllGlobals();
	return returning;
}

function rowsRestoringStale(rows: Row[]): Row[] {
	const stale = rows.filter(
		([, page, key]) => entryOf(PAGES[page](), key).staleRestore !== undefined,
	);
	vi.unstubAllGlobals();
	return stale;
}

export function describeRestorationRows(fileUrl: string) {
	const group = groupOfFile(fileUrl);
	const rows = ROWS.filter(([, page]) => GROUP_OF_PAGE[page] === group);
	const fullRows = rows.filter(([, , , , sequence]) => sequence === "full");
	const entryRows = rows.filter(([, , , , sequence]) => sequence === "entry");
	const focusRows = rowsReturningFocus(rows);
	const staleRows = rowsRestoringStale(rows);

	describe("a submission lost to an expired session", () => {
		afterEach(() => {
			localStorage.clear();
			vi.unstubAllGlobals();
			onlineManager.setOnline(true);
			toast.dismiss();
		});

		test.each(entryRows)(
			"row %i: on %s, reopens %s alone, forgets it on cancel and returns focus",
			async (_row, page, entry) => {
				await runEntryRow(PAGES[page](), entry);
			},
			30_000,
		);

		test.each(fullRows)(
			"row %i: on %s, reopens %s alone, keeps every other entry on the server value and sends a restored save once",
			async (_row, page, entry) => {
				await runHostileSequence(PAGES[page](), entry);
			},
			60_000,
		);

		test.each(staleRows)(
			"row %i: on %s, sends the restored %s with the version it was opened on and meets the alert",
			async (_row, page, entry) => {
				await runStaleRestore(PAGES[page](), entry);
			},
			30_000,
		);

		test.each(fullRows)(
			"row %i: on %s, hides %s from another account",
			async (_row, page, entry) => {
				await runOtherAccount(PAGES[page](), entry);
			},
			30_000,
		);
	});

	describe("a form opened and closed without any session loss", () => {
		afterEach(() => {
			localStorage.clear();
			vi.unstubAllGlobals();
			toast.dismiss();
		});

		test.each(focusRows)(
			"row %i: on %s, returns focus from %s after cancel and after save",
			async (_row, page, entry) => {
				await runPlainFocus(PAGES[page](), entry);
			},
			30_000,
		);
	});
}
