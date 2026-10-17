import type {
	UnitType,
	UnitTypeList,
	UpdateUnitTypeResult,
} from "@bluprint/shared";
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { ProjectParamsDto } from "../projects/dto/project-params.dto";
import { CreateUnitTypeDto } from "./dto/create-unit-type.dto";
import { UnitTypeListDto } from "./dto/unit-type-list.dto";
import { UnitTypeParamsDto } from "./dto/unit-type-params.dto";
import { UnitTypeDto } from "./dto/unit-type.dto";
import { UpdateUnitTypeResultDto } from "./dto/update-unit-type-result.dto";
import { UpdateUnitTypeDto } from "./dto/update-unit-type.dto";
import { UnitTypesService } from "./unit-types.service";

const WRITERS =
	"Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, and a delivered one `409 PROJECT_DELIVERED`. One structure write at a time runs per project, and it moves the project's last activity.";

@ApiTags("Structure")
@Controller("projects/:id")
export class UnitTypesController {
	constructor(private readonly unitTypes: UnitTypesService) {}

	@Get("unit-types")
	@ApiOperation({
		summary: "A project's unit types",
		description:
			"Every unit type (*tipologia*) of the project with its rooms in their stored order, how many units follow it and how many of those have changes against it. The visibility is the project's: a project that does not exist, that the caller has no membership on, or that belongs to another organization answers the same `404 PROJECT_NOT_FOUND`.",
	})
	@ZodResponse({
		status: 200,
		description: "The project's unit types, empty for a project without any.",
		type: UnitTypeListDto,
	})
	@ApiErrorResponses(400, 401, 404)
	list(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
	): Promise<UnitTypeList> {
		return this.unitTypes.list(session.user.id, params.id);
	}

	@Post("unit-types")
	@ApiOperation({
		summary: "Create a unit type",
		description: `Creates a unit type (*tipologia*) with its rooms in the order sent. The id is the client's and is kept across retries: sending the id of a unit type of this project again answers the same \`201\` and changes nothing, and an id that belongs to a unit type or room elsewhere answers \`409 UNIT_TYPE_ID_TAKEN\`. A name already in use in the project, ignoring case and repeated spaces, answers \`409 UNIT_TYPE_NAME_TAKEN\` with the clashing \`names\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 201,
		description: "The unit type, without units yet.",
		type: UnitTypeDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	create(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
		@Body() body: CreateUnitTypeDto,
	): Promise<UnitType> {
		return this.unitTypes.create(session.user.id, params.id, body);
	}

	@Patch("unit-types/:unitTypeId")
	@ApiOperation({
		summary: "Rename a unit type or change its rooms",
		description: `Renames the unit type, replaces its whole ordered list of rooms, or both. The change reaches every unit that follows the unit type: a new room enters all of them, a renamed room changes in the units that did not rename it, a room taken out leaves all of them except the units that renamed it, where it stays as a room only that unit has, and a unit that already has a room of the new name of its own adopts it. The units keep the rooms only they have and the rooms they took out. The answer says how many units changed in \`updatedUnitCount\`. A name already in use in the project answers \`409 UNIT_TYPE_NAME_TAKEN\`; a room id that belongs to another unit type, \`409 UNIT_TYPE_ID_TAKEN\`; a new room name that a unit has in a way the unit type cannot take over, \`409 ROOM_NAME_TAKEN\` with the clashing \`names\`, and nothing changes. A unit type that does not exist in the project answers \`404 UNIT_TYPE_NOT_FOUND\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 200,
		description: "The unit type as it is now and how many units changed.",
		type: UpdateUnitTypeResultDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	update(
		@Session() session: UserSession,
		@Param() params: UnitTypeParamsDto,
		@Body() body: UpdateUnitTypeDto,
	): Promise<UpdateUnitTypeResult> {
		return this.unitTypes.update(
			session.user.id,
			params.id,
			params.unitTypeId,
			body,
		);
	}

	@Delete("unit-types/:unitTypeId")
	@ApiOperation({
		summary: "Delete a unit type",
		description: `Deletes a unit type that no unit follows. A unit type with units answers \`409 UNIT_TYPE_IN_USE\`. A unit type that does not exist in the project answers \`404 UNIT_TYPE_NOT_FOUND\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 200,
		description: "The project's remaining unit types.",
		type: UnitTypeListDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	remove(
		@Session() session: UserSession,
		@Param() params: UnitTypeParamsDto,
	): Promise<UnitTypeList> {
		return this.unitTypes.remove(session.user.id, params.id, params.unitTypeId);
	}
}
