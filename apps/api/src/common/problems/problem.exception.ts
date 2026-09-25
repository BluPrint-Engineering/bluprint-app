import { HttpException } from "@nestjs/common";
import { ProblemInit } from "./problem-details";

export class ProblemException extends HttpException {
	constructor(readonly problem: Omit<ProblemInit, "instance">) {
		super(problem.detail ?? problem.code ?? "", problem.status);
	}
}
