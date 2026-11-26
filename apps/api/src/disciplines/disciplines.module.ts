import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { UnitsModule } from "../units/units.module";
import { DisciplineBatchesController } from "./discipline-batches.controller";
import { DisciplineBatchesRepository } from "./discipline-batches.repository";
import { DisciplineBatchesService } from "./discipline-batches.service";
import { DisciplinesController } from "./disciplines.controller";
import { DisciplinesRepository } from "./disciplines.repository";
import { DisciplinesService } from "./disciplines.service";
import { LocationDisciplinesController } from "./location-disciplines.controller";
import { LocationDisciplinesRepository } from "./location-disciplines.repository";
import { LocationDisciplinesService } from "./location-disciplines.service";

@Module({
	imports: [ProjectsModule, UnitsModule],
	controllers: [
		DisciplinesController,
		LocationDisciplinesController,
		DisciplineBatchesController,
	],
	providers: [
		DisciplinesService,
		DisciplinesRepository,
		LocationDisciplinesService,
		LocationDisciplinesRepository,
		DisciplineBatchesService,
		DisciplineBatchesRepository,
	],
	exports: [DisciplinesService, LocationDisciplinesService],
})
export class DisciplinesModule {}
