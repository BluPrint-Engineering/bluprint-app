import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
	instanceOf,
	PROBLEM_JSON,
	problemDetails,
} from "../problems/problem-details";
import { ProblemException } from "../problems/problem.exception";

/** Bare `@Catch()` so it also takes the router's NotFoundException. The body:
 * docs/adr/0047-errors-are-rfc-9457-problem-details.md */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost): void {
		const http = host.switchToHttp();
		const instance = instanceOf(http.getRequest<Request>().originalUrl);

		const problem =
			exception instanceof ProblemException
				? problemDetails({ ...exception.problem, instance })
				: problemDetails({
						// A plain HttpException's message never reaches the client: it is
						// free text that could carry internals.
						status:
							exception instanceof HttpException
								? exception.getStatus()
								: HttpStatus.INTERNAL_SERVER_ERROR,
						instance,
					});

		if (problem.status >= 500) {
			console.error(exception);
		}

		http
			.getResponse<Response>()
			.status(problem.status)
			.type(PROBLEM_JSON)
			.json(problem);
	}
}
