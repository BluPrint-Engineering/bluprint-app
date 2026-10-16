import { Module } from "@nestjs/common";
import { UnitsRepository } from "./units.repository";
import { UnitsService } from "./units.service";

@Module({
	providers: [UnitsService, UnitsRepository],
	exports: [UnitsService],
})
export class UnitsModule {}
