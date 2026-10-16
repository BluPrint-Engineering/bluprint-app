import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { StructureController } from "./structure.controller";
import { StructureRepository } from "./structure.repository";
import { StructureService } from "./structure.service";

@Module({
	imports: [ProjectsModule],
	controllers: [StructureController],
	providers: [StructureService, StructureRepository],
})
export class StructureModule {}
