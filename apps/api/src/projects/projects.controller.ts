import { ProjectSummary } from "@bluprint/shared";
import { Controller, Get } from "@nestjs/common";
import { Session, UserSession } from "@thallesp/nestjs-better-auth";
import { ZodSerializerDto } from "nestjs-zod";
import { ProjectSummaryDto } from "./dto/project-summary.dto";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
	constructor(private readonly projects: ProjectsService) {}

	@Get()
	@ZodSerializerDto([ProjectSummaryDto])
	list(@Session() session: UserSession): Promise<ProjectSummary[]> {
		return this.projects.listVisible(session.user.id);
	}
}
