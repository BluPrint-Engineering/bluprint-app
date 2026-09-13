import { ProjectSummary } from "@bluprint/shared";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { ProjectSummaryDto } from "./dto/project-summary.dto";
import { ProjectsService } from "./projects.service";

@ApiTags("Projects")
@Controller("projects")
export class ProjectsController {
	constructor(private readonly projects: ProjectsService) {}

	@Get()
	@ApiOperation({
		summary: "My projects",
		description:
			"Lists the projects visible to the caller, with the caller's role in each. A caller with a project membership gets that membership's effective role (`manager` or `assistant`); a caller with no project membership who is the organization's `admin` still sees the project and gets `admin`. Without an organization membership the project does not appear at all — that is data isolation between organizations.",
	})
	@ZodResponse({
		status: 200,
		description: "Visible projects, possibly empty.",
		type: [ProjectSummaryDto],
	})
	@ApiErrorResponses(401)
	list(@Session() session: UserSession): Promise<ProjectSummary[]> {
		return this.projects.listVisible(session.user.id);
	}
}
