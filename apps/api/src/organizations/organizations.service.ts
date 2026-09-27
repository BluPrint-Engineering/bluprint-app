import { Organization } from "@bluprint/shared";
import { Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { OrganizationsRepository } from "./organizations.repository";

@Injectable()
export class OrganizationsService {
	constructor(private readonly organizations: OrganizationsRepository) {}

	async findMine(userId: string): Promise<Organization> {
		const found = await this.organizations.findByMember(userId);
		if (!found) {
			throw new ProblemException({
				status: 404,
				code: "ORGANIZATION_NOT_FOUND",
				detail: "The caller is a member of no organization.",
			});
		}

		return found;
	}
}
