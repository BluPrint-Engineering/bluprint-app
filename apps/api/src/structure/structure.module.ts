import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { UnitsModule } from "../units/units.module";
import { RoomsController } from "./rooms.controller";
import { RoomsRepository } from "./rooms.repository";
import { RoomsService } from "./rooms.service";
import { StructureController } from "./structure.controller";
import { StructureRepository } from "./structure.repository";
import { StructureService } from "./structure.service";
import { UnitTypesController } from "./unit-types.controller";
import { UnitTypesRepository } from "./unit-types.repository";
import { UnitTypesService } from "./unit-types.service";

@Module({
	imports: [ProjectsModule, UnitsModule],
	controllers: [StructureController, UnitTypesController, RoomsController],
	providers: [
		StructureService,
		StructureRepository,
		RoomsService,
		RoomsRepository,
		UnitTypesService,
		UnitTypesRepository,
	],
})
export class StructureModule {}
