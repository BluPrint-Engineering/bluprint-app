import type { UnitTypeList } from "@bluprint/shared";
import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { ProjectParamsDto } from "../projects/dto/project-params.dto";
import { UnitTypeListDto } from "./dto/unit-type-list.dto";
import { UnitTypesService } from "./unit-types.service";

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
}
