import type {
	CreateStructureResult,
	LocationDetail,
	Structure,
} from "@bluprint/shared";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { ProjectParamsDto } from "../projects/dto/project-params.dto";
import { CreateStructureResultDto } from "./dto/create-structure-result.dto";
import { CreateStructureDto } from "./dto/create-structure.dto";
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

	@Post("structure")
	@ApiOperation({
		summary: "Create structure",
		description:
			"Creates the unit types (*tipologias*) with their rooms and the locations of the request, towers, floors, units and common areas, in one transaction: all of them or none. This is the one route every creation of units goes through. Each unit type and location carries the id the client chose. A location also has its parent (one that exists in the project or one listed earlier in the request), its kind, name and position, and a unit may name the unit type it follows (one that exists in the project or one listed in the request) and is then born with that unit type's rooms. A unit type that does not exist answers `400 UNIT_TYPE_NOT_FOUND`. Sending the same request again answers the same `201` and creates nothing: a location whose id already belongs to this project, as the same kind under the same parent, and a unit type whose id already belongs to this project, are skipped. An id that belongs to another project, or to another kind or parent, answers `409 LOCATION_ID_TAKEN`; a unit type or room id that belongs to another project, `409 UNIT_TYPE_ID_TAKEN`. A name already in use where it would go, ignoring case and repeated spaces, answers `409 LOCATION_NAME_TAKEN` with the clashing `names`: a tower is unique in the project, a floor and a unit in their tower, a common area under its parent. A unit type name already in use in the project, with the same comparison, answers `409 UNIT_TYPE_NAME_TAKEN` with the clashing `names`. A parent that does not exist or cannot hold the kind answers `400 LOCATION_PARENT_INVALID`; at most 5,000 locations, 30 units under one floor, 50 unit types and 50 rooms per unit type in one request. Units the request creates beyond what the project's reservation still holds answer `409 NO_UNITS_LEFT` with `requested` and `available`, and nothing is created; only new units count, so the repeated request is never refused for that. Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, and a delivered one `409 PROJECT_DELIVERED`. One structure write at a time runs per project, and it moves the project's last activity.",
	})
	@ZodResponse({
		status: 201,
		description: "The counts of what the request describes.",
		type: CreateStructureResultDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	create(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
		@Body() body: CreateStructureDto,
	): Promise<CreateStructureResult> {
		return this.structure.create(session.user.id, params.id, body);
	}

	@Get("locations/:locationId")
	@ApiOperation({
		summary: "One location",
		description:
			"A tower, floor, unit or common area with its kind, the locations above it and the locations directly below it. A unit and a common area also carry their rooms, and a unit its unit type, its change count and the rooms taken out of it. The project's visibility applies first: `404 PROJECT_NOT_FOUND` for a project the caller cannot see. A location that does not exist, or that belongs to another project, answers `404 LOCATION_NOT_FOUND`.",
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
