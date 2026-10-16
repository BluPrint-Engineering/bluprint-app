import { Module } from "@nestjs/common";
import { MembersModule } from "../members/members.module";
import { UnitsModule } from "../units/units.module";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsRepository } from "./organizations.repository";
import { OrganizationsService } from "./organizations.service";

@Module({
	imports: [MembersModule, UnitsModule],
	controllers: [OrganizationsController],
	providers: [OrganizationsService, OrganizationsRepository],
	exports: [OrganizationsRepository],
})
export class OrganizationsModule {}
