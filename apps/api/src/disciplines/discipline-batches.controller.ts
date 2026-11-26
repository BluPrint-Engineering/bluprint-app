import type { DisciplineBatchResult } from "@bluprint/shared";
import {
	Body,
	Controller,
	HttpCode,
	Param,
	Post,
	UseInterceptors,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { ProjectParamsDto } from "../projects/dto/project-params.dto";
import { ProjectUseInterceptor } from "../projects/project-use.interceptor";
import { DisciplineBatchResultDto } from "./dto/discipline-batch-result.dto";
import { DisciplineBatchDto } from "./dto/discipline-batch.dto";
import { DisciplineBatchesService } from "./discipline-batches.service";

@ApiTags("Disciplines")
@Controller("projects/:id/discipline-batches")
@UseInterceptors(ProjectUseInterceptor)
export class DisciplineBatchesController {
	constructor(private readonly service: DisciplineBatchesService) {}

	@Post()
	@HttpCode(200)
	@ApiOperation({
		summary: "Turn disciplines on and off for many locations at once",
		description:
			"Applies one list of changes to the units and common areas of the target, all or nothing, and answers how many locations received it. The target is `locations` (exactly the ids sent, 1 to 5,000 without repeats, each a unit or a common area), a `floor` (the units and common areas under it) or a `tower` (the units and common areas of all its floors plus the common areas of the tower itself). A floor or tower is resolved by the server when the batch is written, so a unit created meanwhile is reached; the row of the floor or tower itself never changes, and a common area of the project is reached only as a chosen location. A floor or tower with nothing under it answers `{ locations: 0 }`. `on` and `off` name the disciplines to turn on and off, without repeats, with no discipline in both and at least one in all; a discipline the request does not name is left as it was at every location. For each location and named discipline the batch does what the single toggle does: the exception is stored only when it differs from the default of the discipline, and asking for the default removes it, so sending the same request again changes nothing. A location that does not exist in the project answers `404 LOCATION_NOT_FOUND` with the `ids` that are missing; a floor or tower in `locationIds`, a `floor` target that is not a floor or a `tower` target that is not a tower answers `409 LOCATION_KIND_INVALID`; a discipline that does not exist or belongs to another project answers `404 DISCIPLINE_NOT_FOUND`, and General `409 DISCIPLINE_IS_GENERAL`. A request with a discipline in both lists, with none, or with repeated ids answers `400 VALIDATION_FAILED`. Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, and a delivered one `409 PROJECT_DELIVERED`. Nothing changes when any part is refused. One structure write at a time runs per project, and it moves the project's last activity.",
	})
	@ZodResponse({
		status: 200,
		description: "How many locations received the batch.",
		type: DisciplineBatchResultDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	apply(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
		@Body() body: DisciplineBatchDto,
	): Promise<DisciplineBatchResult> {
		return this.service.apply(session.user.id, params.id, body);
	}
}
