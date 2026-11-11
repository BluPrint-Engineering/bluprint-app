import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { mergeMap, type Observable } from "rxjs";
import { ProjectsService } from "./projects.service";

interface ProjectRequest {
	session: UserSession;
	params: { id: string };
}

@Injectable()
export class ProjectUseInterceptor implements NestInterceptor {
	constructor(private readonly projects: ProjectsService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const { session, params } = context
			.switchToHttp()
			.getRequest<ProjectRequest>();
		return next.handle().pipe(
			mergeMap(async (body: unknown) => {
				await this.projects.recordUse(session.user.id, [params.id]);
				return body;
			}),
		);
	}
}
