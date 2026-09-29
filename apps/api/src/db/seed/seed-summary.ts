import type { SeedOrganization, SeedPerson } from "./fixture";

export function describeAccountRoles(
	people: SeedPerson[],
	organizations: SeedOrganization[],
	platformAdmin: SeedPerson,
): { email: string; roles: string }[] {
	return people.map((person) => {
		const labels = organizations.flatMap((organization) =>
			organization.members
				.filter((member) => member.email === person.email)
				.map((member) => `${member.role} @ ${organization.name}`),
		);
		if (person.email === platformAdmin.email) {
			labels.unshift("platform admin");
		}
		return { email: person.email, roles: labels.join(", ") || "none" };
	});
}
