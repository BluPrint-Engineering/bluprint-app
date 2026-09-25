import { Module } from "@nestjs/common";
import { LicensesModule } from "../licenses/licenses.module";
import { MembersModule } from "../members/members.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { SignupProvisioning } from "./signup-provisioning";
import { UsersRepository } from "./users.repository";

@Module({
	imports: [OrganizationsModule, MembersModule, LicensesModule],
	providers: [SignupProvisioning, UsersRepository],
	exports: [SignupProvisioning],
})
export class SignupProvisioningModule {}
