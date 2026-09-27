import { Organization } from "@bluprint/shared";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { OrganizationDto } from "./dto/organization.dto";
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
}
