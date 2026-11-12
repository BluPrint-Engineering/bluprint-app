import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { UnitsModule } from "../units/units.module";
import { LocationContent } from "./location-content";
import { RoomsController } from "./rooms.controller";
import { RoomsRepository } from "./rooms.repository";
import { RoomsService } from "./rooms.service";
import { StructureController } from "./structure.controller";
import { StructureRepository } from "./structure.repository";
import { StructureService } from "./structure.service";
import { TypologiesController } from "./typologies.controller";
import { TypologiesRepository } from "./typologies.repository";
import { TypologiesService } from "./typologies.service";

@Module({
	imports: [ProjectsModule, UnitsModule],
	controllers: [StructureController, TypologiesController, RoomsController],
	providers: [
		LocationContent,
		StructureService,
		StructureRepository,
		RoomsService,
		RoomsRepository,
		TypologiesService,
		TypologiesRepository,
	],
})
export class StructureModule {}
