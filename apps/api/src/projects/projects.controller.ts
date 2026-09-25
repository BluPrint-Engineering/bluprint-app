import { ProjectSummary } from "@bluprint/shared";
import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { CreateProjectDto } from "./dto/create-project.dto";
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

	@Post()
	@ApiOperation({
		summary: "Create a project",
		description:
			"Creates a blank project with the given name and consumes exactly one free license of the caller's organization, in one transaction. Restricted to the organization's `admin`: the caller gets no project membership on the project it just created, and keeps seeing it through the organization membership, reported as `admin`, the same as any other project of theirs. Answers `NO_FREE_LICENSE` when the organization has none left.",
	})
	@ZodResponse({
		status: 201,
		description: "The project that was created.",
		type: ProjectSummaryDto,
	})
	@ApiErrorResponses(400, 401, 403, 409)
	create(
		@Session() session: UserSession,
		@Body() body: CreateProjectDto,
	): Promise<ProjectSummary> {
		return this.projects.create(session.user.id, body.name);
	}
}
