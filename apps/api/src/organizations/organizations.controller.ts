import { Organization, OrganizationUnits } from "@bluprint/shared";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { OrganizationDto } from "./dto/organization.dto";
import { OrganizationUnitsDto } from "./dto/organization-units.dto";
import { OrganizationsService } from "./organizations.service";

@ApiTags("Organization")
@Controller("organization")
export class OrganizationsController {
	constructor(private readonly organizations: OrganizationsService) {}

	@Get()
	@ApiOperation({
		summary: "My organization",
		description:
			"The caller's organization, with the caller's default role in it. The role only tells the client which interface to show; every route still authorizes from the effective role on the project membership, or from the admin's organization membership. Name and e-mail are not repeated here: they come with the session. A caller with no organization membership, such as a platform admin, gets `ORGANIZATION_NOT_FOUND`.",
	})
	@ZodResponse({
		status: 200,
		description: "The caller's organization.",
		type: OrganizationDto,
	})
	@ApiErrorResponses(401, 404)
	findMine(@Session() session: UserSession): Promise<Organization> {
		return this.organizations.findMine(session.user.id);
	}

	@Get("units")
	@ApiOperation({
		summary: "My organization's units",
		description:
			"The units the caller's organization has bought (`contracted`, the sum of its licenses), the units held by its projects' reservations (`reserved`), what is left to start a project (`free`, contracted minus reserved) and what the admin can take back from projects in progress (`reclaimable`: reserved and not yet used). Restricted to the organization's `admin`: a manager, an assistant, or a caller with no organization, such as a platform admin, is refused (ADR 0074).",
	})
	@ZodResponse({
		status: 200,
		description: "The organization's units.",
		type: OrganizationUnitsDto,
	})
	@ApiErrorResponses(401, 403)
	findMyUnits(@Session() session: UserSession): Promise<OrganizationUnits> {
		return this.organizations.findMyUnits(session.user.id);
	}
}
