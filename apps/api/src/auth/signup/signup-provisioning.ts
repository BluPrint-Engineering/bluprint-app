import { Transactional } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { UseCls } from "nestjs-cls";
import { LicensesRepository } from "../../licenses/licenses.repository";
import { MembersRepository } from "../../members/members.repository";
import { OrganizationsRepository } from "../../organizations/organizations.repository";
import { UsersRepository } from "../users.repository";

const FREE_LICENSES = 3;

@Injectable()
export class SignupProvisioning {
	constructor(
		private readonly organizations: OrganizationsRepository,
		private readonly members: MembersRepository,
		private readonly licenses: LicensesRepository,
		private readonly users: UsersRepository,
	) {}

	@UseCls()
	async provisionOrDiscard(user: { id: string; name: string }): Promise<void> {
		try {
			await this.provisionTenant(user.id, user.name);
		} catch (error) {
			await this.users.delete(user.id);
			// rethrow a plain Error, never APIError, or a failed sign-up can still set a session cookie
			throw error;
		}
	}

	@Transactional()
	async provisionTenant(userId: string, name: string): Promise<void> {
		const organization = await this.organizations.insert({ name });

		await this.members.insert({
			organizationId: organization.id,
			userId,
			role: "admin",
		});
		await this.licenses.insertMany(organization.id, FREE_LICENSES);
	}
}
