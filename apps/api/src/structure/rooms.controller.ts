import type { LocationDetail } from "@bluprint/shared";
import {
	Body,
	Controller,
	Delete,
	HttpCode,
	Param,
	Patch,
	Post,
	Put,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { AddRoomDto } from "./dto/add-room.dto";
import { ChangeUnitTypeDto } from "./dto/change-unit-type.dto";
import { DroppedRoomParamsDto } from "./dto/dropped-room-params.dto";
import { LocationDetailDto } from "./dto/location-detail.dto";
import { LocationParamsDto } from "./dto/location-params.dto";
import { RenameRoomDto } from "./dto/rename-room.dto";
import { RoomParamsDto } from "./dto/room-params.dto";
import { RoomsService } from "./rooms.service";

const WRITERS =
	"Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, and a delivered one `409 PROJECT_DELIVERED`. One structure write at a time runs per project, and it moves the project's last activity.";

@ApiTags("Structure")
@Controller("projects/:id")
export class RoomsController {
	constructor(private readonly rooms: RoomsService) {}

	@Post("locations/:locationId/rooms")
	@ApiOperation({
		summary: "Add a room",
		description: `Adds a room only this unit or common area has, after its other rooms. The room's id is the client's: sending it again to the same location answers the same \`201\` and adds nothing, and an id that belongs to a room elsewhere answers \`409 ROOM_ID_TAKEN\`. A name already in use in the location, ignoring case and repeated spaces, answers \`409 ROOM_NAME_TAKEN\` with the clashing \`names\`. A tower or a floor holds no rooms: \`400 LOCATION_KIND_INVALID\`. A location that does not exist in the project answers \`404 LOCATION_NOT_FOUND\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 201,
		description: "The location with its rooms as they are now.",
		type: LocationDetailDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	add(
		@Session() session: UserSession,
		@Param() params: LocationParamsDto,
		@Body() body: AddRoomDto,
	): Promise<LocationDetail> {
		return this.rooms.add(session.user.id, params.id, params.locationId, body);
	}

	@Patch("rooms/:roomId")
	@ApiOperation({
		summary: "Rename a room",
		description: `Renames a room in its own unit or common area. For a room that came from the unit type it changes only this unit, and counts as one of the unit's changes: a later rename in the unit type no longer reaches it. A name already in use in the location answers \`409 ROOM_NAME_TAKEN\`; a room that does not exist in the project, \`404 ROOM_NOT_FOUND\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 200,
		description: "The location with its rooms as they are now.",
		type: LocationDetailDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	rename(
		@Session() session: UserSession,
		@Param() params: RoomParamsDto,
		@Body() body: RenameRoomDto,
	): Promise<LocationDetail> {
		return this.rooms.rename(session.user.id, params.id, params.roomId, body);
	}

	@Delete("rooms/:roomId")
	@ApiOperation({
		summary: "Remove a room",
		description: `Removes a room from its unit or common area. A room only the location has is deleted; a room that came from the unit type is recorded as taken out of this unit, so the unit type does not bring it back, and it can be given back. A room that does not exist in the project answers \`404 ROOM_NOT_FOUND\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 200,
		description: "The location with its rooms as they are now.",
		type: LocationDetailDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	remove(
		@Session() session: UserSession,
		@Param() params: RoomParamsDto,
	): Promise<LocationDetail> {
		return this.rooms.remove(session.user.id, params.id, params.roomId);
	}

	@Delete("locations/:locationId/dropped-rooms/:unitTypeRoomId")
	@ApiOperation({
		summary: "Give back a room taken out of a unit",
		description: `Brings back a room of the unit type that this unit took out, with the name and place it has in the unit type. A room that the unit did not take out answers \`404 ROOM_NOT_FOUND\`; a name already in use in the unit, \`409 ROOM_NAME_TAKEN\`. Only a unit takes this: \`400 LOCATION_KIND_INVALID\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 200,
		description: "The unit with its rooms as they are now.",
		type: LocationDetailDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	giveBack(
		@Session() session: UserSession,
		@Param() params: DroppedRoomParamsDto,
	): Promise<LocationDetail> {
		return this.rooms.giveBack(
			session.user.id,
			params.id,
			params.locationId,
			params.unitTypeRoomId,
		);
	}

	@Put("locations/:locationId/unit-type")
	@ApiOperation({
		summary: "Change a unit's unit type",
		description: `Makes the unit follow another unit type of the project: the unit starts over on the rooms of the new one, and the changes it had against the old one are gone. A \`null\` unit type leaves the unit without one and keeps its current rooms as rooms only it has. Sending the unit type the unit already has changes nothing. A unit type that does not exist in the project answers \`400 UNIT_TYPE_NOT_FOUND\`; a location that is not a unit, \`400 LOCATION_KIND_INVALID\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 200,
		description: "The unit with its unit type and rooms as they are now.",
		type: LocationDetailDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	changeUnitType(
		@Session() session: UserSession,
		@Param() params: LocationParamsDto,
		@Body() body: ChangeUnitTypeDto,
	): Promise<LocationDetail> {
		return this.rooms.changeUnitType(
			session.user.id,
			params.id,
			params.locationId,
			body,
		);
	}

	@Post("locations/:locationId/unit-type/reset")
	@HttpCode(200)
	@ApiOperation({
		summary: "Return a unit to its unit type",
		description: `Undoes the three kinds of change a unit has against its unit type: the rooms only it has go, the rooms it took out come back and the rooms it renamed take the name of the unit type again. A unit without a unit type has nothing to return to and stays as it is. A location that is not a unit answers \`400 LOCATION_KIND_INVALID\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 200,
		description: "The unit with its rooms as they are now.",
		type: LocationDetailDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	resetUnitType(
		@Session() session: UserSession,
		@Param() params: LocationParamsDto,
	): Promise<LocationDetail> {
		return this.rooms.resetToUnitType(
			session.user.id,
			params.id,
			params.locationId,
		);
	}
}
