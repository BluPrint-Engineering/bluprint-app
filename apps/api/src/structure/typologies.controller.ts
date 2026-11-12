import type {
	Typology,
	TypologyList,
	UpdateTypologyResult,
} from "@bluprint/shared";
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	UseInterceptors,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { ProjectUseInterceptor } from "../projects/project-use.interceptor";
import { ProjectParamsDto } from "../projects/dto/project-params.dto";
import { CreateTypologyDto } from "./dto/create-typology.dto";
import { TypologyListDto } from "./dto/typology-list.dto";
import { TypologyParamsDto } from "./dto/typology-params.dto";
import { TypologyDto } from "./dto/typology.dto";
import { UpdateTypologyResultDto } from "./dto/update-typology-result.dto";
import { UpdateTypologyDto } from "./dto/update-typology.dto";
import { TypologiesService } from "./typologies.service";

const WRITERS =
	"Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, and a delivered one `409 PROJECT_DELIVERED`. One structure write at a time runs per project, and it moves the project's last activity.";

@ApiTags("Structure")
@Controller("projects/:id")
@UseInterceptors(ProjectUseInterceptor)
export class TypologiesController {
	constructor(private readonly typologies: TypologiesService) {}

	@Get("typologies")
	@ApiOperation({
		summary: "A project's typologies",
		description:
			"Every typology (*tipologia*) of the project with its rooms in their stored order, how many units follow it and how many of those have changes against it. The visibility is the project's: a project that does not exist, that the caller has no membership on, or that belongs to another organization answers the same `404 PROJECT_NOT_FOUND`.",
	})
	@ZodResponse({
		status: 200,
		description: "The project's typologies, empty for a project without any.",
		type: TypologyListDto,
	})
	@ApiErrorResponses(400, 401, 404)
	list(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
	): Promise<TypologyList> {
		return this.typologies.list(session.user.id, params.id);
	}

	@Post("typologies")
	@ApiOperation({
		summary: "Create a typology",
		description: `Creates a typology (*tipologia*) with its rooms in the order sent. The id is the client's and is kept across retries: sending the id of a typology of this project again answers the same \`201\` and changes nothing, and an id that belongs to a typology or room elsewhere answers \`409 TYPOLOGY_ID_TAKEN\`. A name already in use in the project, ignoring case and repeated spaces, answers \`409 TYPOLOGY_NAME_TAKEN\` with the clashing \`names\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 201,
		description: "The typology, without units yet.",
		type: TypologyDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	create(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
		@Body() body: CreateTypologyDto,
	): Promise<Typology> {
		return this.typologies.create(session.user.id, params.id, body);
	}

	@Patch("typologies/:typologyId")
	@ApiOperation({
		summary: "Rename a typology or change its rooms",
		description: `Renames the typology, replaces its whole ordered list of rooms, or both. The change reaches every unit that follows the typology: a new room enters all of them, a renamed room changes in the units that did not rename it, a room taken out leaves all of them except the units that renamed it, where it stays as a room only that unit has, and a unit that already has a room of the new name of its own adopts it. The units keep the rooms only they have and the rooms they took out. The answer says how many units changed in \`updatedUnitCount\`. A name already in use in the project answers \`409 TYPOLOGY_NAME_TAKEN\`; a room id that belongs to another typology, \`409 TYPOLOGY_ID_TAKEN\`; a new room name that a unit has in a way the typology cannot take over, \`409 ROOM_NAME_TAKEN\` with the clashing \`names\`, and nothing changes. A typology that does not exist in the project answers \`404 TYPOLOGY_NOT_FOUND\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 200,
		description: "The typology as it is now and how many units changed.",
		type: UpdateTypologyResultDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	update(
		@Session() session: UserSession,
		@Param() params: TypologyParamsDto,
		@Body() body: UpdateTypologyDto,
	): Promise<UpdateTypologyResult> {
		return this.typologies.update(
			session.user.id,
			params.id,
			params.typologyId,
			body,
		);
	}

	@Delete("typologies/:typologyId")
	@ApiOperation({
		summary: "Delete a typology",
		description: `Deletes a typology that no unit follows. A typology with units answers \`409 TYPOLOGY_IN_USE\`. A typology that does not exist in the project answers \`404 TYPOLOGY_NOT_FOUND\`. ${WRITERS}`,
	})
	@ZodResponse({
		status: 200,
		description: "The project's remaining typologies.",
		type: TypologyListDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	remove(
		@Session() session: UserSession,
		@Param() params: TypologyParamsDto,
	): Promise<TypologyList> {
		return this.typologies.remove(
			session.user.id,
			params.id,
			params.typologyId,
		);
	}
}
