import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from "@nestjs/common";
import { mergeMap, type Observable } from "rxjs";
import { ProjectsService } from "./projects.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface UseRequest {
	method: string;
	originalUrl?: string;
	url?: string;
	params?: { id?: string };
	body?: { items?: { projectId?: string }[] };
	user?: { id?: string };
	session?: { user?: { id?: string } };
}

@Injectable()
export class ProjectUseInterceptor implements NestInterceptor {
	constructor(private readonly projects: ProjectsService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next
			.handle()
			.pipe(mergeMap((body: unknown) => this.record(context, body)));
	}

	private async record(
		context: ExecutionContext,
		body: unknown,
	): Promise<unknown> {
		const http = context.switchToHttp();
		const req = http.getRequest<UseRequest>();
		const status = http.getResponse<{ statusCode?: number }>().statusCode;
		if ((status ?? 200) < 400) {
			await this.projects.recordUse(userId(req), projectIds(req, body));
		}
		return body;
	}
}

function userId(req: UseRequest): string | undefined {
	return req.user?.id ?? req.session?.user?.id;
}

function projectIds(req: UseRequest, body: unknown): string[] {
	const path = (req.originalUrl ?? req.url ?? "").split("?")[0] ?? "";
	const fromPath = req.params?.id;
	if (fromPath && UUID.test(fromPath) && path.includes("/projects/")) {
		return [fromPath];
	}
	if (req.method === "POST" && path.endsWith("/projects")) {
		const id = (body as { id?: unknown } | null)?.id;
		return typeof id === "string" && UUID.test(id) ? [id] : [];
	}
	if (
		req.method === "PATCH" &&
		path.endsWith("/organization/units/reservations")
	) {
		return (req.body?.items ?? [])
			.map((item) => item.projectId)
			.filter((id): id is string => typeof id === "string" && UUID.test(id));
	}
	return [];
}
