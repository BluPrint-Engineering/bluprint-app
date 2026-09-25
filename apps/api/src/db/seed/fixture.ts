import type { DefaultRole, EffectiveRole } from "@bluprint/shared";

// fine as a fixed value: never used outside a local/dev database
export const SEED_PASSWORD = "bluprint123";

export interface SeedPerson {
	name: string;
	email: string;
}

// the one user seed.ts flags is_platform_admin (ADR 0021)
export const platformAdmin: SeedPerson = {
	name: "Suporte BluPrint",
	email: "suporte@bluprint.test",
};

interface SeedOrgMember {
	email: string;
	role: DefaultRole;
}

interface SeedProjectMember {
	email: string;
	role: EffectiveRole;
}

interface SeedProject {
	name: string;
	members: SeedProjectMember[];
}

interface SeedOrganization {
	name: string;
	// total inserted; each project below consumes one, the rest is the free-license count
	licenses: number;
	members: SeedOrgMember[];
	projects: SeedProject[];
}

// Helena's roles differ by organization and by project (ADR 0022)
const helena: SeedPerson = {
	name: "Helena Martins",
	email: "helena@consultoria.test",
};

export const people: SeedPerson[] = [
	platformAdmin,
	{ name: "Ana Ribeiro", email: "ana@horizonte.test" },
	{ name: "Bruno Costa", email: "bruno@horizonte.test" },
	{ name: "Carla Mendes", email: "carla@horizonte.test" },
	{ name: "Diego Almeida", email: "diego@horizonte.test" },
	{ name: "Elisa Rocha", email: "elisa@horizonte.test" },
	{ name: "Fábio Lima", email: "fabio@horizonte.test" },
	{ name: "Gabriela Souza", email: "gabriela@horizonte.test" },
	{ name: "Igor Pereira", email: "igor@vertice.test" },
	{ name: "Júlia Nunes", email: "julia@vertice.test" },
	{ name: "Karina Duarte", email: "karina@alfa.test" },
	helena,
];

export const organizations: SeedOrganization[] = [
	{
		name: "Construtora Horizonte",
		licenses: 5,
		members: [
			{ email: "ana@horizonte.test", role: "admin" },
			{ email: "bruno@horizonte.test", role: "admin" },
			{ email: "carla@horizonte.test", role: "manager" },
			{ email: "diego@horizonte.test", role: "manager" },
			{ email: "elisa@horizonte.test", role: "assistant" },
			{ email: "fabio@horizonte.test", role: "assistant" },
			// invited before any project existed: default role only, no project_member row yet
			{ email: "gabriela@horizonte.test", role: "assistant" },
			{ email: helena.email, role: "assistant" },
		],
		projects: [
			{
				name: "Residencial Jardins",
				members: [
					{ email: "carla@horizonte.test", role: "manager" },
					// A manager's default role does not carry over: assistant here.
					{ email: "diego@horizonte.test", role: "assistant" },
					{ email: "elisa@horizonte.test", role: "assistant" },
					{ email: helena.email, role: "assistant" },
				],
			},
			{
				name: "Edifício Aurora",
				members: [
					{ email: "carla@horizonte.test", role: "manager" },
					{ email: "diego@horizonte.test", role: "manager" },
					{ email: "elisa@horizonte.test", role: "assistant" },
					{ email: "fabio@horizonte.test", role: "assistant" },
				],
			},
			// No project_member at all: only the two admins can see it.
			{ name: "Galpão Logístico Sul", members: [] },
		],
	},
	{
		name: "Vértice Engenharia",
		// both consumed by the two projects below: a third project answers 409 NO_FREE_LICENSE
		licenses: 2,
		members: [
			{ email: "igor@vertice.test", role: "admin" },
			{ email: "julia@vertice.test", role: "manager" },
			{ email: helena.email, role: "manager" },
		],
		projects: [
			{
				// same name as a Horizonte project, on purpose: proves tenant isolation reads organization_id
				name: "Residencial Jardins",
				members: [
					{ email: "julia@vertice.test", role: "manager" },
					{ email: helena.email, role: "assistant" },
				],
			},
			{
				name: "Torre Ipê",
				members: [{ email: helena.email, role: "manager" }],
			},
		],
	},
	{
		name: "Alfa Construções",
		// No project yet: the empty-state and "create the first project" case.
		licenses: 3,
		members: [{ email: "karina@alfa.test", role: "admin" }],
		projects: [],
	},
];
