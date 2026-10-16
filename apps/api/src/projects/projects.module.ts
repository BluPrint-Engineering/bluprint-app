import { Module } from "@nestjs/common";
import { MembersModule } from "../members/members.module";
import { UnitsModule } from "../units/units.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsRepository } from "./projects.repository";
import { ProjectsService } from "./projects.service";

@Module({
	imports: [MembersModule, UnitsModule],
	controllers: [ProjectsController],
	providers: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
