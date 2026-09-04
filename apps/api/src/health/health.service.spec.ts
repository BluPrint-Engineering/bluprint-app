import { HealthService } from "./health.service";

describe("HealthService", () => {
	test("omits the verbose block unless asked", () => {
		expect(new HealthService().check()).not.toHaveProperty("verbose");
	});

	test("reports the node runtime when verbose", () => {
		expect(new HealthService().check(true).verbose?.runtime).toContain("node");
	});
});
