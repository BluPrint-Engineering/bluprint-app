import {
	ProjectList,
	ProjectManager,
	ProjectSummary,
	ProjectUnitsBalance,
} from "@bluprint/shared";
import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
	Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { ChangeReservationDto } from "./dto/change-reservation.dto";
import { CreateProjectDto } from "./dto/create-project.dto";
import { ProjectListQueryDto } from "./dto/project-list-query.dto";
import { ProjectListDto } from "./dto/project-list.dto";
import { ProjectManagersDto } from "./dto/project-managers.dto";
import { ProjectParamsDto } from "./dto/project-params.dto";
import { ProjectSummaryDto } from "./dto/project-summary.dto";
import { ProjectUnitsDto } from "./dto/project-units.dto";
import { RenameProjectDto } from "./dto/rename-project.dto";
import { ProjectsService } from "./projects.service";

@ApiTags("Projects")
@Controller("projects")
export class ProjectsController {
	constructor(private readonly projects: ProjectsService) {}

	@Get()
	@ApiOperation({
		summary: "My projects",
		description:
			"Lists one page of the projects visible to the caller, optionally only those whose name contains `q`, newest first, by name or by last activity, with the caller's role and status in each and the total across every page. `manager` narrows the list to the projects a user manages; it applies for the organization's `admin` and is ignored for everyone else. Only projects in progress by default; `status` picks `delivered` or `all`. `counts` gives the visible projects per status whatever `status` asked for, so a client can offer the delivered ones when none is in progress. A caller with a project membership gets that membership's effective role (`manager` or `assistant`); a caller with no project membership who is the organization's `admin` still sees the project and gets `admin`. Without an organization membership the project does not appear at all — that is data isolation between organizations.",
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

	@Get("managers")
	@ApiOperation({
		summary: "Managers of the organization",
		description:
			"Everyone who is `manager` on at least one project of the caller's organization, by name, once each: the values the `manager` filter of the project list accepts. It reads the effective role on the project membership, so someone invited as a manager who manages no project yet is not listed (ADR 0022). Restricted to the organization's `admin`.",
	})
	@ZodResponse({
		status: 200,
		description: "The organization's project managers, possibly empty.",
		type: ProjectManagersDto,
	})
	@ApiErrorResponses(401, 403)
	listManagers(@Session() session: UserSession): Promise<ProjectManager[]> {
		return this.projects.listManagers(session.user.id);
	}

	@Get(":id")
	@ApiOperation({
		summary: "One project",
		description:
			"The project's summary, the same one the list gives. The visibility is the list's: the caller must have a membership on the project, or be the `admin` of its organization. A project that does not exist, that the caller has no membership on, or that belongs to another organization answers the same `404 PROJECT_NOT_FOUND`, so the answer never reveals whether it exists.",
	})
	@ZodResponse({
		status: 200,
		description: "The project.",
		type: ProjectSummaryDto,
	})
	@ApiErrorResponses(400, 401, 404)
	read(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
	): Promise<ProjectSummary> {
		return this.projects.findVisible(session.user.id, params.id);
	}

	@Get(":id/units")
	@ApiOperation({
		summary: "A project's units",
		description:
			"How many units the project reserved (`reserved`), how many exist in its structure (`used`) and how many it can still create (`remaining`, reserved minus used). Anyone linked to the project can read it, and the visibility is the project's: a project that does not exist, that the caller has no membership on, or that belongs to another organization answers the same `404 PROJECT_NOT_FOUND`.",
	})
	@ZodResponse({
		status: 200,
		description: "The project's unit balance.",
		type: ProjectUnitsDto,
	})
	@ApiErrorResponses(400, 401, 404)
	readUnits(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
	): Promise<ProjectUnitsBalance> {
		return this.projects.readUnits(session.user.id, params.id);
	}

	@Post()
	@ApiOperation({
		summary: "Create a project",
		description:
			"Creates a blank project with the client's `id` and the given name, and reserves `units` of the caller's organization's free units for it, in one transaction; a reservation holds units without spending them, and licenses are not consumed. The organization is locked while it reserves, so simultaneous creations never reserve more than the free units. Restricted to the organization's `admin`: the caller gets no project membership on the project it just created, and keeps seeing it through the organization membership, reported as `admin`, the same as any other project of theirs. Sending the `id` of a project of the caller's organization again, as a retry after a lost response, answers that project with the same `201`, reserves nothing and ignores the `name` and `units` of the retry, even when the free units have run out since (ADR 0068). An `id` that belongs to another organization answers `409 PROJECT_ID_TAKEN`, revealing nothing about that project. Answers `409 NO_UNITS_LEFT`, with `requested` and `available`, when the free units do not cover the request, and creates nothing.",
	})
	@ZodResponse({
		status: 201,
		description:
			"The project that was created, or the one a repeated `id` already created.",
		type: ProjectSummaryDto,
	})
	@ApiErrorResponses(400, 401, 403, 409)
	create(
		@Session() session: UserSession,
		@Body() body: CreateProjectDto,
	): Promise<ProjectSummary> {
		return this.projects.create(session.user.id, body);
	}

	@Patch(":id")
	@ApiOperation({
		summary: "Rename a project",
		description:
			"Changes the project's name and answers its updated summary. Allowed to the organization's `admin` and to a project's `manager`; an `assistant` gets 403. The visibility is the list's: a project the caller cannot see answers `404 PROJECT_NOT_FOUND`, revealing nothing. A delivered project is closed and answers `409 PROJECT_DELIVERED`. Renaming does not move the last activity.",
	})
	@ZodResponse({
		status: 200,
		description: "The project with its new name.",
		type: ProjectSummaryDto,
	})
	@ApiErrorResponses(400, 401, 403, 404, 409)
	rename(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
		@Body() body: RenameProjectDto,
	): Promise<ProjectSummary> {
		return this.projects.rename(session.user.id, params.id, body);
	}

	@Patch(":id/units")
	@ApiOperation({
		summary: "Change a project's reservation",
		description:
			"Sets how many units the project reserves and answers its updated summary. Restricted to the organization's `admin`; a `manager` or an `assistant` of the project gets 403. The visibility is the list's: a project the caller cannot see answers `404 PROJECT_NOT_FOUND`, revealing nothing. The reservation can go as low as the units the project uses and as high as its current reservation plus the organization's free units; below the first it answers `409 RESERVATION_BELOW_USED` with `used`, above the second `409 NO_UNITS_LEFT` with `requested` (how many units the reservation grows by) and `available` (the free units), and changes nothing. A delivered project answers `409 PROJECT_DELIVERED`: delivery already set its reservation to the units it used. The project is locked, then the organization, so a change never races a creation or another change into reserving more than the contracted units.",
	})
	@ZodResponse({
		status: 200,
		description: "The project with its new reservation.",
		type: ProjectSummaryDto,
	})
	@ApiErrorResponses(400, 401, 403, 404, 409)
	changeReservation(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
		@Body() body: ChangeReservationDto,
	): Promise<ProjectSummary> {
		return this.projects.changeReservation(session.user.id, params.id, body);
	}

	@Post(":id/delivery")
	@HttpCode(200)
	@ApiOperation({
		summary: "Deliver a project",
		description:
			"Hands the project over: it becomes `delivered`, records who delivered it and when (`delivery`), and its reservation becomes the units it used, so the unused part returns to the organization's free units in the same transaction. Delivery is final: there is no route to reopen a project (ADR 0069). Allowed to the organization's `admin` and to a project's `manager`; an `assistant` gets 403. The visibility is the list's: a project the caller cannot see answers `404 PROJECT_NOT_FOUND`, revealing nothing. A project already delivered answers `409 PROJECT_DELIVERED`. Delivering does not move the last activity. The project is locked, then the organization, so a delivery never races a unit creation or a reservation change into leaving a project using more units than it reserves.",
	})
	@ZodResponse({
		status: 200,
		description: "The delivered project.",
		type: ProjectSummaryDto,
	})
	@ApiErrorResponses(400, 401, 403, 404, 409)
	deliver(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
	): Promise<ProjectSummary> {
		return this.projects.deliver(session.user.id, params.id);
	}
}
