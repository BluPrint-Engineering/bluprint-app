import { ProjectList, ProjectSummary } from "@bluprint/shared";
import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { CreateProjectDto } from "./dto/create-project.dto";
import { ProjectListQueryDto } from "./dto/project-list-query.dto";
import { ProjectListDto } from "./dto/project-list.dto";
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
			"Lists one page of the projects visible to the caller, optionally only those whose name contains `q`, newest first or by name, with the caller's role and status in each and the total across every page. Only projects in progress by default; `status` picks `delivered` or `all`. `counts` gives the visible projects per status whatever `status` asked for, so a client can offer the delivered ones when none is in progress. A caller with a project membership gets that membership's effective role (`manager` or `assistant`); a caller with no project membership who is the organization's `admin` still sees the project and gets `admin`. Without an organization membership the project does not appear at all — that is data isolation between organizations.",
	})
	@ZodResponse({
		status: 200,
		description: "One page of visible projects, possibly empty.",
		type: ProjectListDto,
	})
	@ApiErrorResponses(400, 401)
	list(
		@Session() session: UserSession,
		@Query() query: ProjectListQueryDto,
	): Promise<ProjectList> {
		return this.projects.listVisible(session.user.id, query);
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
