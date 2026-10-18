import {
	LOCATION_NAME_MAX_LENGTH,
	type Structure,
	type SubtreeRooms,
} from "@bluprint/shared";
import { describe, expect, test } from "vitest";
import { nth } from "@/test/nth";
import { floor, structureOf, tower } from "@/test/structureApi";
import {
	buildDuplicate,
	copiedUnitName,
	type DuplicateSource,
	findDuplicateSource,
	renumberedUnitNames,
	suggestedCopyName,
	unitsCopied,
} from "./duplicate";
import {
	copiedUnitsTakenText,
	duplicatedToast,
	duplicateMenuLabel,
	duplicateTitle,
} from "./duplicateText";
import { duplicateLine, duplicateOverText } from "./reserveText";

const plain = (text: string) => text.replaceAll(" ", " ");

function sequentialIds() {
	const issued = new Map<string, string>();
	return (key: string) => {
		let id = issued.get(key);
		if (!id) {
			id = `new-${issued.size + 1}`;
			issued.set(key, id);
		}
		return id;
	};
}

const noRooms: SubtreeRooms = { locations: [] };

function sourceOf(
	structure: Structure,
	type: DuplicateSource["type"],
	id: string,
): DuplicateSource {
	const found = findDuplicateSource(structure, type, id);
	if (!found) throw new Error(`no ${type} ${id}`);
	return found;
}

function scene() {
	const ninth = floor(
		"9º andar",
		[
			{ name: "901", unitType: "Tipologia A", changes: 3 },
			{ name: "902", unitType: "Tipologia B" },
			"903",
			"904",
		],
		["Hall", "Terraço"],
	);
	const tenth = floor("10º andar", ["1001", "1002"]);
	const towerA = tower("Torre A", [ninth, tenth], ["Salão de festas"]);
	const towerB = tower("Torre B", [floor("1º andar", ["101A", "101B"])]);
	return {
		ninth,
		tenth,
		towerA,
		towerB,
		structure: structureOf([towerA, towerB], ["Guarita"]),
	};
}

const roomsOf = (
	id: string,
	rooms: SubtreeRooms["locations"][number]["rooms"],
	droppedRooms: SubtreeRooms["locations"][number]["droppedRooms"] = [],
): SubtreeRooms["locations"][number] => ({ id, rooms, droppedRooms });

describe("findDuplicateSource", () => {
	test("finds a tower, a floor and a unit with the tower they sit in", () => {
		const { ninth, towerA, structure } = scene();
		const unit = nth(ninth.units, 2);

		expect(findDuplicateSource(structure, "tower", towerA.id)).toEqual({
			type: "tower",
			tower: towerA,
		});
		expect(findDuplicateSource(structure, "floor", ninth.id)).toEqual({
			type: "floor",
			tower: towerA,
			floor: ninth,
		});
		expect(findDuplicateSource(structure, "unit", unit.id)).toEqual({
			type: "unit",
			tower: towerA,
			floor: ninth,
			unit,
		});
	});

	test("finds nothing for an id of another kind or one that is gone", () => {
		const { ninth, structure } = scene();

		expect(findDuplicateSource(structure, "tower", ninth.id)).toBeUndefined();
		expect(findDuplicateSource(structure, "unit", "gone")).toBeUndefined();
	});
});

describe("suggestedCopyName", () => {
	test("takes the next letter for a tower", () => {
		const { towerA, structure } = scene();

		expect(
			suggestedCopyName(sourceOf(structure, "tower", towerA.id), structure),
		).toBe("Torre C");
	});

	test("takes the floor above the top one for a floor, whichever floor is copied", () => {
		const { ninth, structure } = scene();

		expect(
			suggestedCopyName(sourceOf(structure, "floor", ninth.id), structure),
		).toBe("11º andar");
	});

	test("leaves the name empty when the tower has no numbered floor", () => {
		const ground = floor("Térreo", [], ["Hall"]);
		const structure = structureOf([tower("Torre A", [ground])]);

		expect(
			suggestedCopyName(sourceOf(structure, "floor", ground.id), structure),
		).toBe("");
	});

	test("takes the next number on the floor for a unit", () => {
		const { ninth, structure } = scene();
		const first = nth(ninth.units, 0);

		expect(
			suggestedCopyName(sourceOf(structure, "unit", first.id), structure),
		).toBe("905");
	});
});

describe("unitsCopied", () => {
	test("counts the units the copy creates", () => {
		const { ninth, towerA, structure } = scene();
		const unit = nth(ninth.units, 0);

		expect(unitsCopied(sourceOf(structure, "unit", unit.id))).toBe(1);
		expect(unitsCopied(sourceOf(structure, "floor", ninth.id))).toBe(4);
		expect(unitsCopied(sourceOf(structure, "tower", towerA.id))).toBe(6);
	});
});

describe("copiedUnitName", () => {
	const none = new Set<string>();

	test.each([
		["901", 9, 13, "1301"],
		["9A", 9, 13, "13A"],
		["1201", 12, 13, "1301"],
		["101", 1, 10, "1001"],
	])(
		"renumbers %s from floor %i to floor %i as %s",
		(name, from, to, expected) => {
			expect(copiedUnitName(name, from, to, none)).toBe(expected);
		},
	);

	test("renumbers even when the renumbered name is taken", () => {
		expect(copiedUnitName("901", 9, 14, new Set(["1401"]))).toBe("1401");
	});

	test.each([
		["a name that does not start with the floor number", "Suíte", 9, 13],
		["a floor without a number", "901", undefined, 13],
		["a copy without a number", "901", 9, undefined],
	])("numbers %s as its first copy", (_label, name, from, to) => {
		expect(copiedUnitName(name, from, to, none)).toBe(`${name} cópia 1`);
	});

	test("takes the lowest copy number free in the tower, ignoring case and spaces", () => {
		const taken = new Set(["loja 1 cópia 1", "loja 1 cópia 3"]);

		expect(copiedUnitName("Loja  1", undefined, undefined, taken)).toBe(
			"Loja  1 cópia 2",
		);
	});

	test("shortens a long name and keeps the copy number whole", () => {
		const long = `Loja ${"x".repeat(LOCATION_NAME_MAX_LENGTH - 5)}`;

		const copy = copiedUnitName(long, undefined, undefined, none);

		expect(copy).toHaveLength(LOCATION_NAME_MAX_LENGTH);
		expect(copy).toBe(`${long.slice(0, LOCATION_NAME_MAX_LENGTH - 8)} cópia 1`);
	});

	test("does not leave a space before the copy number when it shortens", () => {
		const name = `${"a".repeat(51)} b${"c".repeat(7)}`;

		expect(copiedUnitName(name, undefined, undefined, none)).toBe(
			`${"a".repeat(51)} cópia 1`,
		);
	});

	test("numbers a copy that would grow past the limit by renumbering", () => {
		const name = `13${"x".repeat(LOCATION_NAME_MAX_LENGTH - 2)}`;

		const copy = copiedUnitName(name, 13, 100, none);

		expect(copy).toBe(`${name.slice(0, LOCATION_NAME_MAX_LENGTH - 8)} cópia 1`);
	});
});

describe("buildDuplicate of a unit", () => {
	test("hangs the next unit under the same floor at the end of its children", () => {
		const { ninth, structure } = scene();
		const unit = nth(ninth.units, 0);

		const request = buildDuplicate(
			sourceOf(structure, "unit", unit.id),
			"905",
			noRooms,
			sequentialIds(),
		);

		expect(request.unitTypes).toEqual([]);
		expect(request.locations).toEqual([
			{
				id: "new-1",
				parentId: ninth.id,
				type: "unit",
				name: "905",
				unitTypeId: unit.unitType?.id,
			},
		]);
	});

	test("keeps the rooms, the renamed one and the dropped ones, with new ids", () => {
		const { ninth, structure } = scene();
		const unit = nth(ninth.units, 0);
		const below: SubtreeRooms = {
			locations: [
				roomsOf(
					unit.id,
					[
						{
							id: "r1",
							name: "Sala de estar",
							unitTypeRoomId: "t1",
							renamed: true,
						},
						{ id: "r2", name: "Cozinha", unitTypeRoomId: "t2", renamed: false },
						{ id: "r3", name: "Varanda", unitTypeRoomId: null, renamed: false },
					],
					[{ unitTypeRoomId: "t3", name: "Lavanderia" }],
				),
			],
		};

		const [copy] = buildDuplicate(
			sourceOf(structure, "unit", unit.id),
			"905",
			below,
			sequentialIds(),
		).locations;

		expect(copy?.rooms).toEqual([
			{
				id: "new-2",
				name: "Sala de estar",
				unitTypeRoomId: "t1",
				renamed: true,
			},
			{ id: "new-3", name: "Cozinha", unitTypeRoomId: "t2" },
			{ id: "new-4", name: "Varanda" },
		]);
		expect(copy?.droppedRooms).toEqual(["t3"]);
	});

	test("sends no rooms for a unit the rooms read did not list, so it is born with its type's", () => {
		const { ninth, structure } = scene();
		const unit = nth(ninth.units, 1);

		const [copy] = buildDuplicate(
			sourceOf(structure, "unit", unit.id),
			"905",
			noRooms,
			sequentialIds(),
		).locations;

		expect(copy).not.toHaveProperty("rooms");
		expect(copy).not.toHaveProperty("droppedRooms");
	});

	test("leaves the unit type out for a unit without one", () => {
		const { ninth, structure } = scene();
		const unit = nth(ninth.units, 2);

		const [copy] = buildDuplicate(
			sourceOf(structure, "unit", unit.id),
			"905",
			noRooms,
			sequentialIds(),
		).locations;

		expect(copy).not.toHaveProperty("unitTypeId");
	});
});

describe("buildDuplicate of a floor", () => {
	test("puts a new floor on top of the tower with the units renumbered and the areas kept", () => {
		const { ninth, towerA, structure } = scene();

		const { locations } = buildDuplicate(
			sourceOf(structure, "floor", ninth.id),
			"11º andar",
			noRooms,
			sequentialIds(),
		);

		expect(
			locations.map(({ type, name, parentId, position }) => [
				type,
				name,
				parentId,
				position,
			]),
		).toEqual([
			["floor", "11º andar", towerA.id, undefined],
			["unit", "1101", "new-1", 0],
			["unit", "1102", "new-1", 1],
			["unit", "1103", "new-1", 2],
			["unit", "1104", "new-1", 3],
			["common_area", "Hall", "new-1", 4],
			["common_area", "Terraço", "new-1", 5],
		]);
	});

	test("keeps the unit types and the changes of each unit", () => {
		const { ninth, structure } = scene();
		const [first, second] = ninth.units;
		const below: SubtreeRooms = {
			locations: [
				roomsOf(first?.id ?? "", [
					{ id: "r1", name: "Varanda", unitTypeRoomId: null, renamed: false },
				]),
			],
		};

		const { locations } = buildDuplicate(
			sourceOf(structure, "floor", ninth.id),
			"11º andar",
			below,
			sequentialIds(),
		);

		expect(locations[1]).toMatchObject({
			unitTypeId: first?.unitType?.id,
			rooms: [{ name: "Varanda" }],
		});
		expect(locations[2]?.unitTypeId).toBe(second?.unitType?.id);
	});

	test("copies the rooms of a common area", () => {
		const { ninth, structure } = scene();
		const hall = nth(ninth.commonAreas, 0);
		const below: SubtreeRooms = {
			locations: [
				roomsOf(hall.id, [
					{ id: "r1", name: "Depósito", unitTypeRoomId: null, renamed: false },
				]),
			],
		};

		const { locations } = buildDuplicate(
			sourceOf(structure, "floor", ninth.id),
			"11º andar",
			below,
			sequentialIds(),
		);

		expect(locations.find(({ name }) => name === "Hall")?.rooms).toEqual([
			{ id: "new-7", name: "Depósito" },
		]);
	});

	test("renumbers by the next floor when the name has no number", () => {
		const { ninth, structure } = scene();

		const { locations } = buildDuplicate(
			sourceOf(structure, "floor", ninth.id),
			"Cobertura",
			noRooms,
			sequentialIds(),
		);

		expect(
			locations.filter(({ type }) => type === "unit").map(({ name }) => name),
		).toEqual(["1101", "1102", "1103", "1104"]);
	});

	test("marks the units as copies when the source floor has no number", () => {
		const cobertura = floor("Cobertura", ["C1", "C2"]);
		const structure = structureOf([
			tower("Torre A", [floor("1º andar", ["101"]), cobertura]),
		]);

		const { locations } = buildDuplicate(
			sourceOf(structure, "floor", cobertura.id),
			"2º andar",
			noRooms,
			sequentialIds(),
		);

		expect(
			locations.filter(({ type }) => type === "unit").map(({ name }) => name),
		).toEqual(["C1 cópia 1", "C2 cópia 1"]);
	});

	test("numbers the units of a second copy past the first one's", () => {
		const terreo = floor("Térreo", ["Loja 1", "Loja 2"]);
		const first = floor("Térreo 2", ["Loja 1 cópia 1", "Loja 2 cópia 1"]);
		const structure = structureOf([tower("Torre A", [terreo, first])]);

		const { locations } = buildDuplicate(
			sourceOf(structure, "floor", terreo.id),
			"Térreo 3",
			noRooms,
			sequentialIds(),
		);

		expect(
			locations.filter(({ type }) => type === "unit").map(({ name }) => name),
		).toEqual(["Loja 1 cópia 2", "Loja 2 cópia 2"]);
	});

	test("gives two units of one copy different copy names", () => {
		const terreo = floor("Térreo", ["Loja", "Loja cópia 1"]);
		const structure = structureOf([tower("Torre A", [terreo])]);

		const { locations } = buildDuplicate(
			sourceOf(structure, "floor", terreo.id),
			"Mezanino",
			noRooms,
			sequentialIds(),
		);

		expect(
			locations.filter(({ type }) => type === "unit").map(({ name }) => name),
		).toEqual(["Loja cópia 2", "Loja cópia 1 cópia 1"]);
	});
});

describe("buildDuplicate of a tower", () => {
	test("copies every floor, unit and common area under the next tower", () => {
		const { towerA, structure } = scene();

		const { locations } = buildDuplicate(
			sourceOf(structure, "tower", towerA.id),
			"Torre C",
			noRooms,
			sequentialIds(),
		);

		expect(locations[0]).toEqual({
			id: "new-1",
			parentId: null,
			type: "tower",
			name: "Torre C",
		});
		expect(
			locations
				.slice(1)
				.map(({ type, name, parentId }) => [type, name, parentId]),
		).toEqual([
			["floor", "9º andar", "new-1"],
			["unit", "901", "new-2"],
			["unit", "902", "new-2"],
			["unit", "903", "new-2"],
			["unit", "904", "new-2"],
			["common_area", "Hall", "new-2"],
			["common_area", "Terraço", "new-2"],
			["floor", "10º andar", "new-1"],
			["unit", "1001", "new-9"],
			["unit", "1002", "new-9"],
			["common_area", "Salão de festas", "new-1"],
		]);
	});

	test("keeps the order of floors, units and areas as positions", () => {
		const { towerA, structure } = scene();

		const { locations } = buildDuplicate(
			sourceOf(structure, "tower", towerA.id),
			"Torre C",
			noRooms,
			sequentialIds(),
		);

		expect(
			locations
				.filter(({ parentId }) => parentId === "new-1")
				.map(({ name, position }) => [name, position]),
		).toEqual([
			["9º andar", 0],
			["10º andar", 1],
			["Salão de festas", 2],
		]);
	});

	test("asks the same ids again on a retry", () => {
		const { towerA, structure } = scene();
		const idFor = sequentialIds();
		const source = sourceOf(structure, "tower", towerA.id);

		const first = buildDuplicate(source, "Torre C", noRooms, idFor);
		const again = buildDuplicate(source, "Torre D", noRooms, idFor);

		expect(again.locations.map(({ id }) => id)).toEqual(
			first.locations.map(({ id }) => id),
		);
	});

	test("never carries pins, plans or unit data, only the structure", () => {
		const { towerA, structure } = scene();

		const { locations } = buildDuplicate(
			sourceOf(structure, "tower", towerA.id),
			"Torre C",
			noRooms,
			sequentialIds(),
		);

		const keys = new Set(locations.flatMap((entry) => Object.keys(entry)));
		expect([...keys].sort()).toEqual(
			["id", "name", "parentId", "position", "type", "unitTypeId"].sort(),
		);
	});
});

describe("duplicate texts", () => {
	test("names the menu item and the dialog after the kind", () => {
		expect(duplicateMenuLabel("tower")).toBe("Duplicar torre");
		expect(duplicateMenuLabel("floor")).toBe("Duplicar andar");
		expect(duplicateMenuLabel("unit")).toBe("Duplicar unidade");
		expect(duplicateTitle("tower", "Torre A")).toBe("Duplicar a Torre A");
		expect(duplicateTitle("tower", "Bloco 1")).toBe("Duplicar a torre Bloco 1");
		expect(duplicateTitle("floor", "9º andar")).toBe("Duplicar o 9º andar");
		expect(duplicateTitle("floor", "Cobertura")).toBe(
			"Duplicar o andar Cobertura",
		);
		expect(duplicateTitle("unit", "903")).toBe("Duplicar a unidade 903");
	});

	test("confirms the copy by its kind", () => {
		expect(duplicatedToast("floor", "13º andar")).toBe("13º andar criado.");
		expect(duplicatedToast("floor", "Cobertura")).toBe(
			"Andar Cobertura criado.",
		);
		expect(duplicatedToast("tower", "Torre C")).toBe("Torre C criada.");
		expect(duplicatedToast("unit", "905")).toBe("Unidade 905 criada.");
	});

	test("asks for another floor number when copied units are taken", () => {
		expect(copiedUnitsTakenText(["1401"], true)).toBe(
			"Já existe a unidade “1401” nesta torre. Troque o número do andar e tente de novo.",
		);
		expect(copiedUnitsTakenText(["1401", "1402"], true, "Torre A")).toBe(
			"Já existem as unidades “1401” e “1402” na Torre A. Troque o número do andar e tente de novo.",
		);
	});

	test("asks to try again when copy names were just taken", () => {
		expect(copiedUnitsTakenText(["Loja 1 cópia 1"], false)).toBe(
			"A unidade “Loja 1 cópia 1” acabou de ser criada nesta torre. Tente de novo para usar o próximo número de cópia.",
		);
		expect(
			copiedUnitsTakenText(["Loja 1 cópia 1", "Loja 2 cópia 1"], false),
		).toBe(
			"As unidades “Loja 1 cópia 1” e “Loja 2 cópia 1” acabaram de ser criadas nesta torre. Tente de novo para usar o próximo número de cópia.",
		);
	});
});

describe("renumberedUnitNames", () => {
	test("lists the names a floor copy takes by its number", () => {
		const ninth = floor("9º andar", ["901", "Suíte"]);
		const structure = structureOf([tower("Torre A", [ninth])]);

		expect([
			...renumberedUnitNames(
				sourceOf(structure, "floor", ninth.id),
				"14º andar",
			),
		]).toEqual(["1401"]);
	});

	test("lists none for a floor without a number or a unit", () => {
		const terreo = floor("Térreo", ["Loja 1"]);
		const structure = structureOf([tower("Torre A", [terreo])]);
		const unit = nth(terreo.units, 0);

		expect(
			renumberedUnitNames(sourceOf(structure, "floor", terreo.id), "Mezanino")
				.size,
		).toBe(0);
		expect(
			renumberedUnitNames(sourceOf(structure, "unit", unit.id), "Loja 2").size,
		).toBe(0);
	});
});

describe("duplicateLine", () => {
	test("says what the copy uses and what is left", () => {
		expect(plain(duplicateLine(4, 12))).toBe(
			"Cria 4 unidades das 12 que restam nesta obra. Depois, sobram 8.",
		);
	});

	test("says the only unit left in the singular", () => {
		expect(plain(duplicateLine(1, 1))).toBe(
			"Cria 1 unidade, a única que resta nesta obra. Depois, sobram 0.",
		);
	});

	test("says one left over in the singular", () => {
		expect(plain(duplicateLine(11, 12))).toBe(
			"Cria 11 unidades das 12 que restam nesta obra. Depois, sobra 1.",
		);
	});
});

describe("duplicateOverText", () => {
	test("says how many the copy creates and how many remain", () => {
		expect(plain(duplicateOverText("Duplicar o 9º andar", 4, 2))).toBe(
			"Duplicar o 9º andar cria 4 unidades e restam 2.",
		);
		expect(plain(duplicateOverText("Duplicar a Torre A", 6, 1))).toBe(
			"Duplicar a Torre A cria 6 unidades e resta 1.",
		);
	});

	test("says the reserva is over when nothing remains", () => {
		expect(duplicateOverText("Duplicar a unidade 903", 1, 0)).toBe(
			"Duplicar a unidade 903 cria 1 unidade e a reserva da obra acabou.",
		);
	});
});
