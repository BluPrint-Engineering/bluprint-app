import {
	Organization,
	OrganizationReservations,
	OrganizationUnits,
	type UpdateReservations,
} from "@bluprint/shared";
import { Transactional } from "@nestjs-cls/transactional";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { ProblemException } from "../common/problems/problem.exception";
import { MembersRepository } from "../members/members.repository";
import { UnitsService } from "../units/units.service";
import { OrganizationsRepository } from "./organizations.repository";

@Injectable()
export class OrganizationsService {
	constructor(
		private readonly organizations: OrganizationsRepository,
		private readonly members: MembersRepository,
		private readonly units: UnitsService,
	) {}

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

	async findMyUnits(userId: string): Promise<OrganizationUnits> {
		return this.units.read(await this.adminOrganizationOf(userId));
	}

	async findMyReservations(userId: string): Promise<OrganizationReservations> {
		return this.units.readReservations(await this.adminOrganizationOf(userId));
	}

	@Transactional()
	async changeMyReservations(
		userId: string,
		body: UpdateReservations,
	): Promise<OrganizationReservations> {
		return this.units.changeReservations(
			await this.adminOrganizationOf(userId),
			body,
		);
	}

	private async adminOrganizationOf(userId: string): Promise<string> {
		const membership = await this.members.findByUser(userId);
		if (membership?.role !== "admin") {
			throw new ForbiddenException();
		}

		return membership.organizationId;
	}
}
