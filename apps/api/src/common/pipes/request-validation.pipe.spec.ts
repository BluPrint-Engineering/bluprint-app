import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { ProblemException } from "../problems/problem.exception";
import { RequestValidationPipe } from "./request-validation.pipe";

class ProjectInputDto extends createZodDto(
	z.object({
		name: z.string().min(1),
		count: z.number().optional(),
		"a/b": z.number().optional(),
	}),
) {}

function failureOf(value: unknown, type: "body" | "query" | "param") {
	try {
		new RequestValidationPipe().transform(value, {
			type,
			metatype: ProjectInputDto,
		});
	} catch (error) {
		return error;
	}
	throw new Error("expected the pipe to throw");
}

describe("RequestValidationPipe", () => {
	test("passes valid input through, parsed", () => {
		const pipe = new RequestValidationPipe();

		expect(
			pipe.transform(
				{ name: "Casa Moinhos" },
				{ type: "body", metatype: ProjectInputDto },
			),
		).toEqual({
			name: "Casa Moinhos",
		});
	});

	test("answers a VALIDATION_FAILED problem pointing at each invalid input", () => {
		const error = failureOf({ name: "", count: "x" }, "body");

		expect(error).toBeInstanceOf(ProblemException);
		const { problem } = error as ProblemException;
		expect(problem).toMatchObject({
			status: 400,
			code: "VALIDATION_FAILED",
			detail: "2 inputs are invalid.",
		});
		expect(problem.errors?.map((e) => [e.pointer, e.code])).toEqual([
			["/body/name", "TOO_SMALL"],
			["/body/count", "INVALID_TYPE"],
		]);
	});

	test("escapes `/` in a key as `~1`, as JSON Pointer requires", () => {
		const { problem } = failureOf(
			{ name: "x", "a/b": "x" },
			"body",
		) as ProblemException;

		expect(problem.errors?.[0]?.pointer).toBe("/body/a~1b");
	});

	test("roots the pointer at where the input came from", () => {
		const { problem } = failureOf({}, "query") as ProblemException;

		expect(problem.errors?.[0]?.pointer).toBe("/query/name");
	});
});
