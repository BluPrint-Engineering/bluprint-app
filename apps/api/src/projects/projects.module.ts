import { Module } from "@nestjs/common";
import { LicensesModule } from "../licenses/licenses.module";
import { MembersModule } from "../members/members.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsRepository } from "./projects.repository";
import { ProjectsService } from "./projects.service";

@Module({
	imports: [MembersModule, LicensesModule],
	controllers: [ProjectsController],
	providers: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
