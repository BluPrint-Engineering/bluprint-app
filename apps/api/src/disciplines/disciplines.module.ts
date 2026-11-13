import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { UnitsModule } from "../units/units.module";
import { DisciplinesController } from "./disciplines.controller";
import { DisciplinesRepository } from "./disciplines.repository";
import { DisciplinesService } from "./disciplines.service";

@Module({
	imports: [ProjectsModule, UnitsModule],
	controllers: [DisciplinesController],
	providers: [DisciplinesService, DisciplinesRepository],
})
export class DisciplinesModule {}
