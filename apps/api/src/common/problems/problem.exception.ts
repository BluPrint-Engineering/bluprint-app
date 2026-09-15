import { HttpException } from "@nestjs/common";
import { ProblemInit } from "./problem-details";

/** see docs/adr/0047-errors-are-rfc-9457-problem-details.md */
export class ProblemException extends HttpException {
	constructor(readonly problem: Omit<ProblemInit, "instance">) {
		super(problem.detail ?? problem.code ?? "", problem.status);
	}
}
