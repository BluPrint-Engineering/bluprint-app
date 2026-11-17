import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { UnitsModule } from "../units/units.module";
import { DisciplinesController } from "./disciplines.controller";
import { DisciplinesRepository } from "./disciplines.repository";
import { DisciplinesService } from "./disciplines.service";
import { LocationDisciplinesController } from "./location-disciplines.controller";
import { LocationDisciplinesRepository } from "./location-disciplines.repository";
import { LocationDisciplinesService } from "./location-disciplines.service";

@Module({
	imports: [ProjectsModule, UnitsModule],
	controllers: [DisciplinesController, LocationDisciplinesController],
	providers: [
		DisciplinesService,
		DisciplinesRepository,
		LocationDisciplinesService,
		LocationDisciplinesRepository,
	],
	exports: [DisciplinesService, LocationDisciplinesService],
})
export class DisciplinesModule {}
