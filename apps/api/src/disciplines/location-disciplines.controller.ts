import type { LocationDisciplines } from "@bluprint/shared";
import { Body, Controller, Param, Put, UseInterceptors } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { ProjectUseInterceptor } from "../projects/project-use.interceptor";
import { LocationDisciplineParamsDto } from "./dto/location-discipline-params.dto";
import { LocationDisciplinesDto } from "./dto/location-disciplines.dto";
import { SetLocationDisciplineDto } from "./dto/set-location-discipline.dto";
import { LocationDisciplinesService } from "./location-disciplines.service";

@ApiTags("Disciplines")
@Controller("projects/:id")
@UseInterceptors(ProjectUseInterceptor)
export class LocationDisciplinesController {
	constructor(private readonly service: LocationDisciplinesService) {}

	@Put("locations/:locationId/disciplines/:disciplineId")
	@ApiOperation({
		summary: "Turn a discipline on or off at a location",
		description:
			"Sets whether one discipline applies at one tower, floor, unit or common area and answers that location's disciplines after the change, in the order of the catalog, General left out. The exception is stored only when the requested value differs from the default of the kind of location (a unit or common area: what the discipline applies by default; a floor or tower: only Hidráulica and Elétrica); asking for the default removes the exception, and sending the same request again answers the same. No other location changes. General cannot be changed: `409 DISCIPLINE_IS_GENERAL`. A location that does not exist in the project answers `404 LOCATION_NOT_FOUND`, a discipline that does not exist or belongs to another project `404 DISCIPLINE_NOT_FOUND`. Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, and a delivered one `409 PROJECT_DELIVERED`. One structure write at a time runs per project, and it moves the project's last activity.",
	})
	@ZodResponse({
		status: 200,
		description: "The location's disciplines after the change.",
		type: LocationDisciplinesDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	setApplies(
		@Session() session: UserSession,
		@Param() params: LocationDisciplineParamsDto,
		@Body() body: SetLocationDisciplineDto,
	): Promise<LocationDisciplines> {
		return this.service.setApplies(
			session.user.id,
			params.id,
			params.locationId,
			params.disciplineId,
			body,
		);
	}
}
