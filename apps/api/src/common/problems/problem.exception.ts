import { HttpException } from "@nestjs/common";
import { ProblemInit } from "./problem-details";

/** Any other `HttpException` reaches the client as its status alone: its message
 * is dropped. See docs/adr/0047-errors-are-rfc-9457-problem-details.md */
export class ProblemException extends HttpException {
	constructor(readonly problem: Omit<ProblemInit, "instance">) {
		super(problem.detail ?? problem.code ?? "", problem.status);
	}
}
