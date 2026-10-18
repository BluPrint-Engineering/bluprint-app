import type {
	CreateStructureResult,
	LocationDetail,
	LocationRef,
	RemoveLocationResult,
	Structure,
	SubtreeRooms,
} from "@bluprint/shared";
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { ProjectParamsDto } from "../projects/dto/project-params.dto";
import { CreateStructureResultDto } from "./dto/create-structure-result.dto";
import { CreateStructureDto } from "./dto/create-structure.dto";
import { LocationDetailDto } from "./dto/location-detail.dto";
import { LocationParamsDto } from "./dto/location-params.dto";
import { LocationRefDto } from "./dto/location-ref.dto";
import { MoveLocationDto } from "./dto/move-location.dto";
import { RemoveLocationResultDto } from "./dto/remove-location-result.dto";
import { RenameLocationDto } from "./dto/rename-location.dto";
import { StructureDto } from "./dto/structure.dto";
import { SubtreeRoomsDto } from "./dto/subtree-rooms.dto";
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
			"Creates the unit types (*tipologias*) with their rooms and the locations of the request, towers, floors, units and common areas, in one transaction: all of them or none. This is the one route every creation of units goes through. Each unit type and location carries the id the client chose. A location also has its parent (one that exists in the project or one listed earlier in the request), its kind, name and position, and a unit may name the unit type it follows (one that exists in the project or one listed in the request) and is then born with that unit type's rooms unless the request lists the rooms it has: a location may carry `rooms` (a unit or a common area, each with its own id and name, and for a unit's room of the unit type the id it came from and whether it was renamed) and a unit `droppedRooms` (the rooms of its unit type it took out), which is how a copy keeps what the original changed. A unit that follows a unit type and lists its rooms accounts for each room of that unit type once, in `rooms` or in `droppedRooms`, and a room of the unit type it did not rename carries the unit type's name; a room that does not belong to the unit's unit type, one left out, or one not renamed under another name answers `400 UNIT_TYPE_ROOM_INVALID`; a room id already in use, `409 ROOM_ID_TAKEN`. A unit type that does not exist answers `400 UNIT_TYPE_NOT_FOUND`. Sending the same request again answers the same `201` and creates nothing: a location whose id already belongs to this project, as the same kind under the same parent, and a unit type whose id already belongs to this project, are skipped. An id that belongs to another project, or to another kind or parent, answers `409 LOCATION_ID_TAKEN`; a unit type or room id that belongs to another project, `409 UNIT_TYPE_ID_TAKEN`. A name already in use where it would go, ignoring case and repeated spaces, answers `409 LOCATION_NAME_TAKEN` with the clashing `names`: a tower is unique in the project, a floor and a unit in their tower, a common area under its parent. A unit type name already in use in the project, with the same comparison, answers `409 UNIT_TYPE_NAME_TAKEN` with the clashing `names`. A parent that does not exist or cannot hold the kind answers `400 LOCATION_PARENT_INVALID`; at most 5,000 locations, 30 units under one floor, 200 rooms per location, 50 unit types and 50 rooms per unit type in one request; a request marked `copy`, which repeats locations the project already has, skips the units-per-floor and rooms-per-location limits. Units the request creates beyond what the project's reservation still holds answer `409 NO_UNITS_LEFT` with `requested` and `available`, and nothing is created; only new units count, so the repeated request is never refused for that. Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, and a delivered one `409 PROJECT_DELIVERED`. One structure write at a time runs per project, and it moves the project's last activity.",
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

	@Get("locations/:locationId/subtree-rooms")
	@ApiOperation({
		summary: "The rooms below a location",
		description:
			"Every unit and common area at or below the location, a tower, floor, unit or common area, each with its rooms (where each came from and whether it was renamed here) and, for a unit, the rooms of its unit type it took out, in one response: what copying the location needs. The project's visibility applies first: `404 PROJECT_NOT_FOUND` for a project the caller cannot see. A location that does not exist, or that belongs to another project, answers `404 LOCATION_NOT_FOUND`.",
	})
	@ZodResponse({
		status: 200,
		description: "The rooms of the units and common areas below the location.",
		type: SubtreeRoomsDto,
	})
	@ApiErrorResponses(400, 401, 404)
	readSubtreeRooms(
		@Session() session: UserSession,
		@Param() params: LocationParamsDto,
	): Promise<SubtreeRooms> {
		return this.structure.readSubtreeRooms(
			session.user.id,
			params.id,
			params.locationId,
		);
	}

	@Patch("locations/:locationId")
	@ApiOperation({
		summary: "Rename a location",
		description:
			"Changes the name of a tower, floor, unit or common area and answers the location's id, kind and new name. The name is unique where the location sits, as when it is created: a tower in the project, a floor and a unit in their tower, a common area under its parent, ignoring case and repeated spaces; accents count. A name already in use there answers `409 LOCATION_NAME_TAKEN` with the clashing `names`; the location's own name, even in another case, is never a clash. Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, a location that does not exist or belongs to another project `404 LOCATION_NOT_FOUND`, and a delivered project `409 PROJECT_DELIVERED`. One structure write at a time runs per project, and it moves the project's last activity.",
	})
	@ZodResponse({
		status: 200,
		description: "The renamed location.",
		type: LocationRefDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	renameLocation(
		@Session() session: UserSession,
		@Param() params: LocationParamsDto,
		@Body() body: RenameLocationDto,
	): Promise<LocationRef> {
		return this.structure.rename(
			session.user.id,
			params.id,
			params.locationId,
			body,
		);
	}

	@Post("locations/:locationId/move")
	@HttpCode(200)
	@ApiOperation({
		summary: "Move a location among its siblings",
		description:
			"Swaps a location with its neighbour of the same kind under the same parent and answers the location's id, kind and name. For a floor, `up` is one floor higher; for any other kind, `up` is one place earlier in the list, passing over the locations of other kinds between them. At the top or at the end it does nothing and still answers `200`. Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, a location that does not exist or belongs to another project `404 LOCATION_NOT_FOUND`, and a delivered project `409 PROJECT_DELIVERED`. One structure write at a time runs per project, and it moves the project's last activity.",
	})
	@ZodResponse({
		status: 200,
		description: "The location, in its new place.",
		type: LocationRefDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	moveLocation(
		@Session() session: UserSession,
		@Param() params: LocationParamsDto,
		@Body() body: MoveLocationDto,
	): Promise<LocationRef> {
		return this.structure.move(
			session.user.id,
			params.id,
			params.locationId,
			body,
		);
	}

	@Delete("locations/:locationId")
	@ApiOperation({
		summary: "Remove a location",
		description:
			"One action for every location: the server decides by what the location holds. A location with nothing in it is deleted with everything below it, a floor with its units and common areas, a tower with its floors, and the answer says what went: `{ outcome: \"deleted\", removed }`, with the counts of floors, units and common areas removed, the location itself included. Nothing a project holds counts as content yet, so every removal deletes. Each unit removed gives its place back to the project's reservation. Sending it again for a location that is already gone answers `404 LOCATION_NOT_FOUND`. Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, a location that does not exist or belongs to another project `404 LOCATION_NOT_FOUND`, and a delivered project `409 PROJECT_DELIVERED`. One structure write at a time runs per project, and it moves the project's last activity.",
	})
	@ZodResponse({
		status: 200,
		description: "What the removal did.",
		type: RemoveLocationResultDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	removeLocation(
		@Session() session: UserSession,
		@Param() params: LocationParamsDto,
	): Promise<RemoveLocationResult> {
		return this.structure.remove(session.user.id, params.id, params.locationId);
	}
}
