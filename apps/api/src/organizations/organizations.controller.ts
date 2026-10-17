import {
	Organization,
	OrganizationReservations,
	OrganizationUnits,
} from "@bluprint/shared";
import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { OrganizationDto } from "./dto/organization.dto";
import { OrganizationReservationsDto } from "./dto/organization-reservations.dto";
import { OrganizationUnitsDto } from "./dto/organization-units.dto";
import { UpdateReservationsDto } from "./dto/update-reservations.dto";
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

	@Get("units/reservations")
	@ApiOperation({
		summary: "My organization's reservations",
		description:
			"Every project in progress with the units it reserves and the units it has used, by name, in one response (the project list pages; this screen needs them all), and what the delivered projects hold (`delivered`: how many and the units their reservations became). Rows plus `delivered.used` add up to the `reserved` of `GET /organization/units`. Restricted to the organization's `admin`: a manager, an assistant, or a caller with no organization is refused (ADR 0074).",
	})
	@ZodResponse({
		status: 200,
		description: "The reservations of the projects in progress.",
		type: OrganizationReservationsDto,
	})
	@ApiErrorResponses(401, 403)
	findMyReservations(
		@Session() session: UserSession,
	): Promise<OrganizationReservations> {
		return this.organizations.findMyReservations(session.user.id);
	}

	@Patch("units/reservations")
	@ApiOperation({
		summary: "Change several reservations at once",
		description:
			"Sets the reservation of each project in `items` and answers the reservations as `GET` does. All or nothing: when any item is refused none changes. Restricted to the organization's `admin`. Each item is refused as a single project's reservation is, and the refusal names the project: `404 PROJECT_NOT_FOUND` with `projectId` for a project that is not the organization's; `409 PROJECT_DELIVERED` with `projectId` for one delivered meanwhile, so the client reloads the rows; `409 RESERVATION_BELOW_USED` with `items`, every refused project with the `used` it cannot go below; and `409 NO_UNITS_LEFT` when the reservations grow by more than the free units, with `requested` (the net growth of the whole request, lowered reservations counting against raised ones) and `available`. The projects are locked in id order, then the organization, so a batch never races a creation or another change into reserving more than the contracted units.",
	})
	@ZodResponse({
		status: 200,
		description: "The reservations after the change.",
		type: OrganizationReservationsDto,
	})
	@ApiErrorResponses(400, 401, 403, 404, 409)
	changeMyReservations(
		@Session() session: UserSession,
		@Body() body: UpdateReservationsDto,
	): Promise<OrganizationReservations> {
		return this.organizations.changeMyReservations(session.user.id, body);
	}
}
