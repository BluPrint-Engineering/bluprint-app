import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MembersModule } from "../members/members.module";
import { UnitsModule } from "../units/units.module";
import { ProjectUseInterceptor } from "./project-use.interceptor";
import { ProjectsController } from "./projects.controller";
import { ProjectsRepository } from "./projects.repository";
import { ProjectsService } from "./projects.service";

@Module({
	imports: [MembersModule, UnitsModule],
	controllers: [ProjectsController],
	providers: [
		ProjectsService,
		ProjectsRepository,
		{ provide: APP_INTERCEPTOR, useClass: ProjectUseInterceptor },
	],
	exports: [ProjectsService],
})
export class ProjectsModule {}
