import type { Discipline, DisciplineList } from "@bluprint/shared";
import {
	Body,
	Controller,
	Get,
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
import { CreateDisciplineDto } from "./dto/create-discipline.dto";
import { DisciplineListDto } from "./dto/discipline-list.dto";
import { DisciplineDto } from "./dto/discipline.dto";
import { DisciplinesService } from "./disciplines.service";

@ApiTags("Disciplines")
@Controller("projects/:id/disciplines")
@UseInterceptors(ProjectUseInterceptor)
export class DisciplinesController {
	constructor(private readonly disciplines: DisciplinesService) {}

	@Get()
	@ApiOperation({
		summary: "A project's disciplines",
		description:
			"Every discipline (*disciplina*) of the project, General included: General first, then Hidráulica and Elétrica, then the extra ones in the order they were created. General has no color. The visibility is the project's: a project that does not exist, that the caller has no membership on, or that belongs to another organization answers the same `404 PROJECT_NOT_FOUND`.",
	})
	@ZodResponse({
		status: 200,
		description: "The project's disciplines.",
		type: DisciplineListDto,
	})
	@ApiErrorResponses(400, 401, 404)
	list(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
	): Promise<DisciplineList> {
		return this.disciplines.list(session.user.id, params.id);
	}

	@Post()
	@ApiOperation({
		summary: "Create an extra discipline",
		description:
			"Creates an extra discipline with the first color of the fixed list that the project does not use, and no plan of its own. The id is the client's and is kept across retries: sending the id of a discipline of this project again answers that discipline with `201` and changes nothing, whatever name or choice came with it; an id that belongs to a discipline of another project answers `409 DISCIPLINE_ID_TAKEN`. A name already in use in the project, ignoring accents, case and repeated spaces and \"Geral\" included, answers `409 DISCIPLINE_NAME_TAKEN` with the `name` as it is spelled there. A project that already has ten extra disciplines answers `409 DISCIPLINE_LIMIT_REACHED`. Where the discipline applies is chosen here and never changes. Anyone linked to the project may write, and the admin of its organization; a project that cannot be seen answers `404 PROJECT_NOT_FOUND`, and a delivered one `409 PROJECT_DELIVERED`. One structure write at a time runs per project, and it moves the project's last activity.",
	})
	@ZodResponse({
		status: 201,
		description: "The discipline.",
		type: DisciplineDto,
	})
	@ApiErrorResponses(400, 401, 404, 409)
	create(
		@Session() session: UserSession,
		@Param() params: ProjectParamsDto,
		@Body() body: CreateDisciplineDto,
	): Promise<Discipline> {
		return this.disciplines.create(session.user.id, params.id, body);
	}
}
