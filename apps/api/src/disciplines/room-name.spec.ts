import { namePairs } from "../structure/name-pairs";
import { comparableRoomName, sameRoomName } from "@bluprint/shared";

describe("room and discipline names", () => {
	test.each(namePairs)("%j and %j: same name is %s", (a, b, same) => {
		expect(sameRoomName(a, b)).toBe(same);
	});

	test("the comparable form drops accents, case and repeated spaces", () => {
		expect(comparableRoomName("  Sala  de  Ênfase ")).toBe("sala de enfase");
	});
});
