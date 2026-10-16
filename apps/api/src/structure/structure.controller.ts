import type { LocationDetail, Structure } from "@bluprint/shared";
import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { ProjectParamsDto } from "../projects/dto/project-params.dto";
import { LocationDetailDto } from "./dto/location-detail.dto";
import { LocationParamsDto } from "./dto/location-params.dto";
import { StructureDto } from "./dto/structure.dto";
import { StructureService } from "./structure.service";

@ApiTags("Structure")
@Controller("projects/:id")
export class StructureController {
	constructor(private readonly structure: StructureService) {}

	@Get("structure")
	@ApiOperation({
		summary: "A project's structure",
		description:
			"Every tower with its floors, each floor with its units and common areas, the common areas of each tower and of the project itself, and the counts, in one response, in their stored order: what the façade and the tower cards read. A project with a single tower still lists it. The visibility is the project's: a project that does not exist, that the caller has no membership on, or that belongs to another organization answers the same `404 PROJECT_NOT_FOUND`.",
	})
	@ZodResponse({
		status: 200,
		description: "The project's structure, empty for a project without one.",
		type: StructureDto,
	})
	@ApiErrorResponses(400, 401, 404)
	readStructure(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
	): Promise<Structure> {
		return this.structure.readStructure(session.user.id, params.id);
	}

	@Get("locations/:locationId")
	@ApiOperation({
		summary: "One location",
		description:
			"A tower, floor, unit or common area with its kind, the locations above it and the locations directly below it. The project's visibility applies first: `404 PROJECT_NOT_FOUND` for a project the caller cannot see. A location that does not exist, or that belongs to another project, answers `404 LOCATION_NOT_FOUND`.",
	})
	@ZodResponse({
		status: 200,
		description: "The location.",
		type: LocationDetailDto,
	})
	@ApiErrorResponses(400, 401, 404)
	readLocation(
		@Session() session: UserSession,
		@Param() params: LocationParamsDto,
	): Promise<LocationDetail> {
		return this.structure.readLocation(
			session.user.id,
			params.id,
			params.locationId,
		);
	}
}
