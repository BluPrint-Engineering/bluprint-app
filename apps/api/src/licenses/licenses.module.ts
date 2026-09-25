import { Module } from "@nestjs/common";
import { LicensesRepository } from "./licenses.repository";

@Module({
	providers: [LicensesRepository],
	exports: [LicensesRepository],
})
export class LicensesModule {}
