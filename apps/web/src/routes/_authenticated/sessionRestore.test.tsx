import type {
	LocationDetail,
	OrganizationReservations,
	ProjectSummary,
	Typology,
} from "@bluprint/shared";
import { onlineManager } from "@tanstack/react-query";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { rememberFailedSubmission } from "@/features/auth";
import {
	type SessionDraftKind,
	sessionDraftKinds,
} from "@/features/auth/sessionDraft";
import { project } from "@/test/projectsApi";
import { json, organization, renderAt, signedIn } from "@/test/renderApp";
import {
	expiringServer,
	otherAccount,
	signInAgain,
	signOut,
} from "@/test/sessionExpiry";
import {
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
	writableApi,
} from "@/test/structureApi";

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
	openedByAddress?: true;
	shows: string[];
	focusAfterCancel?: () => Promise<HTMLElement>;
	focusAfterSave?: () => Promise<HTMLElement>;
	request: string;
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
		(name) => screen.queryByRole("textbox", { name }) !== null,
	);
	return [...dialogs, ...forms];
}

const byRole = (role: string, name: string) => () =>
	screen.findByRole(role, { name });

async function pick(menu: string, item: string) {
	await user.click(await screen.findByRole("button", { name: menu }));
	await user.click(await screen.findByRole("menuitem", { name: item }));
}

const click = (role: string, name: string) => async () => {
	await user.click(await screen.findByRole(role, { name }));
};

const submitBeside = (field: string, button: string) => async () => {
	const form = (await screen.findByRole("textbox", { name: field })).closest(
		"form",
	);
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
): Pick<Entry, "fill" | "expectTyped" | "expectCurrent"> {
	const field = () => screen.findByRole("textbox", { name });
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

async function expectNothingOpen(page: Page) {
	await waitFor(() => expect(openForms(page.inline)).toEqual([]));
}

async function expectServerValue(entry: Entry) {
	await entry.open();
	await entry.expectCurrent();
	await entry.cancel();
	await entry.exit?.();
	await entry.reenter?.();
}

async function runHostileSequence(page: Page, key: string) {
	const entry = page.entries[key];
	if (!entry) throw new Error(`no entry ${key}`);
	renderAt(page.path);
	await page.ready();

	await expireOnSave(page, entry);
	await expectRestored(page, entry);
	expect(page.server.writes).toEqual([entry.request]);

	await entry.cancel();
	const { focusAfterCancel, focusAfterSave } = entry;
	if (focusAfterCancel) {
		await waitFor(async () => expect(await focusAfterCancel()).toHaveFocus());
	}
	await entry.exit?.();
	await entry.reenter?.();
	await expectNothingOpen(page);
	for (const each of Object.values(page.entries)) {
		await expectServerValue(each);
	}

	await reload(page);
	await expectNothingOpen(page);
	await expectServerValue(entry);

	await expireOnSave(page, entry);
	await expectRestored(page, entry);
	await entry.submit();
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

async function runOtherAccount(page: Page, key: string) {
	const entry = page.entries[key];
	if (!entry) throw new Error(`no entry ${key}`);
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

const ADMIN_PROJECT: ProjectSummary = {
	...project(3, "admin"),
	name: "Casa Moinhos",
	units: { reserved: 2, used: 2 },
};

const SAVE = click("button", "Salvar");
const CANCEL = click("button", "Cancelar");

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
	const api = writableApi(ADMIN_PROJECT, structureOf([towerA]), { remaining });
	const server = expiringServer(api.handler);
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
			...textField("Adicionar cômodo", "Copa", ""),
			submit: submitBeside("Adicionar cômodo", "Adicionar"),
			cancel: CANCEL,
			shows: ["Adicionar cômodo"],
			focusAfterCancel: byRole("button", "Adicionar cômodo"),
			focusAfterSave: byRole("button", "Adicionar cômodo"),
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
					: "Trocar a tipologia do Hall",
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
	const api = writableApi(ADMIN_PROJECT, structureOf([towerA]), { remaining });
	const server = expiringServer(api.handler);
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
	let typologies: Typology[] = [typeA];
	const own = (url: URL, init?: RequestInit) => {
		const method = init?.method ?? "GET";
		const body = init?.body
			? (JSON.parse(String(init.body)) as Record<string, unknown>)
			: {};
		if (url.pathname === base && method === "PATCH") {
			api.state.summary = { ...api.state.summary, name: String(body.name) };
			return json(api.state.summary);
		}
		if (url.pathname === `${base}/typologies`) {
			if (method === "GET") return json({ typologies });
			const created: Typology = {
				id: String(body.id),
				name: String(body.name),
				locationType: "unit",
				rooms: [],
				locationCount: 0,
				changedLocationCount: 0,
			};
			typologies = [...typologies, created];
			return json(created, 201);
		}
		const one = new RegExp(`^${base}/typologies/([^/]+)$`).exec(url.pathname);
		if (one && method === "PATCH") {
			typologies = typologies.map((each) =>
				each.id === one[1]
					? {
							...each,
							...(typeof body.name === "string" && { name: body.name }),
							...(Array.isArray(body.rooms) && {
								rooms: body.rooms as Typology["rooms"],
							}),
						}
					: each,
			);
			const typology = typologies.find((each) => each.id === one[1]);
			return json({ typology, updatedLocationCount: 0 });
		}
		return undefined;
	};
	const server = expiringServer(
		combine(own, structureApi(ADMIN_PROJECT.id, structureOf([])), api.handler),
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
				focusAfterSave: byRole("button", "Nova tipologia"),
				afterSave: async () => {
					await screen.findByRole("textbox", { name: "Novo cômodo" });
					await CANCEL();
				},
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
			},
			editRooms: {
				open: () => pick("Ações da Tipologia A", "Editar cômodos"),
				fill: async () => {
					await user.click(
						await screen.findByRole("button", { name: "Tirar Sala" }),
					);
				},
				expectTyped: async () => {
					await screen.findByRole("textbox", { name: "Novo cômodo" });
					expect(tags()).toEqual([]);
				},
				expectCurrent: async () => {
					await screen.findByRole("textbox", { name: "Novo cômodo" });
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
			await user.click(
				await screen.findByRole("link", { name: "Casa Moinhos" }),
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
	const describeTower = textField("Último andar", adding ? "5" : "3", "");
	const fillTower = async () => {
		await describeTower.fill();
		if (!adding) {
			const perFloor = await screen.findByRole("textbox", {
				name: "Unidades por andar",
			});
			await user.clear(perFloor);
			await user.type(perFloor, "4");
		}
	};
	const entries: Record<string, Entry> = {};
	if (remaining > 20) {
		entries.create = {
			open: async () => {},
			...describeTower,
			fill: fillTower,
			submit: async () => user.click(await createButton()),
			...leaveAndReturn,
			shows: [],
			request: `POST /api/projects/${summary.id}/structure`,
		};
	} else {
		entries.reservation = {
			open: async () => {
				await fillTower();
				await user.click(
					await screen.findByRole("button", { name: "Alterar reserva" }),
				);
			},
			...textField("Unidades reservadas", "160", "150"),
			submit: SAVE,
			cancel: CANCEL,
			shows: ["Alterar reserva"],
			focusAfterCancel: createButton,
			focusAfterSave: createButton,
			request: `PATCH /api/projects/${summary.id}/units`,
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

const PAGES = {
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

const ROWS: [number, keyof typeof PAGES, string, SessionDraftKind][] = [
	[1, "newProject", "createProject", "create-project"],
	[2, "units", "reservations", "update-reservations"],
	[3, "configuration", "renameProject", "rename-project"],
	[4, "configuration", "reservation", "change-reservation"],
	[5, "configuration", "createTypology", "create-typology"],
	[6, "configuration", "renameTypology", "update-typology"],
	[7, "configuration", "editRooms", "update-typology"],
	[8, "facade", "addTower", "create-structure"],
	[9, "facade", "addArea", "create-structure"],
	[10, "facadeExhausted", "areaRowReservation", "change-reservation"],
	[11, "facade", "renameArea", "rename-location"],
	[12, "tower", "renameTower", "rename-location"],
	[13, "tower", "duplicateTower", "duplicate-location"],
	[14, "towerExhausted", "duplicateReservation", "change-reservation"],
	[15, "tower", "renameArea", "rename-location"],
	[16, "tower", "addArea", "create-structure"],
	[17, "towerExhausted", "areaRowReservation", "change-reservation"],
	[18, "floor", "renameFloor", "rename-location"],
	[19, "floor", "duplicateFloor", "duplicate-location"],
	[20, "floorExhausted", "duplicateFloorReservation", "change-reservation"],
	[21, "floor", "renameUnit", "rename-location"],
	[22, "floor", "duplicateUnit", "duplicate-location"],
	[23, "floorExhausted", "duplicateUnitReservation", "change-reservation"],
	[24, "floor", "renameArea", "rename-location"],
	[25, "floor", "addUnit", "create-structure"],
	[26, "floor", "addArea", "create-structure"],
	[27, "floorExhausted", "unitRowReservation", "change-reservation"],
	[28, "floorExhausted", "areaRowReservation", "change-reservation"],
	[29, "unit", "rename", "rename-location"],
	[30, "unit", "duplicate", "duplicate-location"],
	[31, "unitExhausted", "duplicateReservation", "change-reservation"],
	[32, "unit", "changeTypology", "change-typology"],
	[33, "unit", "addRoom", "add-room"],
	[34, "unit", "renameRoom", "rename-room"],
	[35, "commonArea", "rename", "rename-location"],
	[36, "commonArea", "addRoom", "add-room"],
	[37, "commonArea", "renameRoom", "rename-room"],
	[38, "wizard", "create", "create-structure"],
	[39, "wizardExhausted", "reservation", "change-reservation"],
	[40, "addFloors", "create", "create-structure"],
	[41, "addFloorsExhausted", "reservation", "change-reservation"],
	[42, "tower", "addAreaFromMenu", "create-structure"],
	[43, "facade", "addAreaFromMenu", "create-structure"],
	[44, "facadeBlank", "addTower", "create-structure"],
	[45, "commonArea", "changeTypology", "change-typology"],
];

describe("a submission lost to an expired session", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
		onlineManager.setOnline(true);
	});

	test.each(ROWS)(
		"row %i: on %s, reopens %s alone, forgets it on cancel and returns focus",
		async (_row, page, entry, _kind) => {
			await runHostileSequence(PAGES[page](), entry);
		},
		60_000,
	);

	test.each(ROWS)(
		"row %i: on %s, hides %s from another account",
		async (_row, page, entry, _kind) => {
			await runOtherAccount(PAGES[page](), entry);
		},
		30_000,
	);
});

async function runPlainFocus(page: Page, key: string) {
	const entry = page.entries[key];
	if (!entry) throw new Error(`no entry ${key}`);
	const { focusAfterCancel, focusAfterSave } = entry;
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

const PLAIN_FOCUS_ROWS = ROWS.filter(([row]) =>
	[5, 6, 7, 32, 33, 34, 36, 37, 42, 43, 45].includes(row),
);

describe("a form opened and closed without any session loss", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
	});

	test.each(PLAIN_FOCUS_ROWS)(
		"row %i: on %s, returns focus from %s after cancel and after save",
		async (_row, page, entry) => {
			await runPlainFocus(PAGES[page](), entry);
		},
		30_000,
	);
});

describe("the restoration table", () => {
	test("has a row for every kind of submission that is kept", () => {
		const covered = new Set(ROWS.map(([, , , kind]) => kind));
		expect(sessionDraftKinds.filter((kind) => !covered.has(kind))).toEqual([]);
	});
});

describe("a kept reserva change without the entry that sent it", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
	});

	test.each([
		["floorExhausted", "unitRowReservation"],
		["towerExhausted", "areaRowReservation"],
		["unitExhausted", "duplicateReservation"],
	] as const)("opens nothing on %s", async (key, entryKey) => {
		const page = PAGES[key]();
		rememberFailedSubmission({
			accountId: signedIn.user.id,
			path: page.path,
			kind: "change-reservation",
			variables: { reserved: 5 },
		});
		renderAt(page.path);
		await page.ready();

		await expectNothingOpen(page);
		const entry = page.entries[entryKey];
		if (!entry) throw new Error(`no entry ${entryKey}`);
		await expectServerValue(entry);
	});
});

describe("an action without fields lost to an expired session", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
	});

	const ACTIONS = [
		[
			"removing a room",
			() => pick("Ações do cômodo Lavanderia", "Remover cômodo"),
			"DELETE",
			"/rooms/",
		],
		[
			"taking a room of the typology out",
			(holder: "unit" | "commonArea") =>
				pick(
					"Ações do cômodo Sala",
					holder === "unit"
						? "Remover desta unidade"
						: "Remover desta área comum",
				),
			"DELETE",
			"/rooms/",
		],
		[
			"giving a room back",
			click("button", "Devolver o cômodo Cozinha"),
			"DELETE",
			"/dropped-rooms/",
		],
		[
			"returning to the typology",
			click("button", "Voltar à tipologia"),
			"POST",
			"/typology/reset",
		],
	] as const;

	test.each(
		(["unit", "commonArea"] as const).flatMap((holder) =>
			ACTIONS.map((action) => [holder, ...action] as const),
		),
	)(
		"on %s, does not reopen or repeat %s after signing back in",
		async (holder, _action, act, method, path) => {
			const page = PAGES[holder]();
			renderAt(page.path);
			await page.ready();
			page.server.expireNextWrite();
			await act(holder);
			await screen.findByLabelText("E-mail");
			await signInAgain();
			await page.ready();
			await screen.findByRole("heading", { name: "Cômodos" });

			await expectNothingOpen(page);
			expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
			expect(page.server.writes).toHaveLength(1);
			expect(page.server.writes[0]).toMatch(new RegExp(`^${method} .*${path}`));
		},
	);
});
