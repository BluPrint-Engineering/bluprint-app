import type {
	DefaultRole,
	EffectiveRole,
	ProjectStatus,
} from "@bluprint/shared";

export const FIXTURE_PASSWORD = "canteiro-de-obras-azul";

export interface SeedPerson {
	name: string;
	email: string;
}

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
	// a delivered project holds only the units it used, and a seeded project has used none (ADR 0074)
	reservedUnits: number;
	status?: ProjectStatus | undefined;
	members: SeedProjectMember[];
}

export interface SeedOrganization {
	name: string;
	// one license per entry; the organization's contracted units are their sum
	licenses: number[];
	members: SeedOrgMember[];
	projects: SeedProject[];
}

export const people: SeedPerson[] = [
	platformAdmin,
	{ name: "Ana Ribeiro", email: "ana@horizonte.test" },
	{ name: "Bruno Costa", email: "bruno@horizonte.test" },
	{ name: "Carla Mendes", email: "carla@horizonte.test" },
	{ name: "Diego Almeida", email: "diego@horizonte.test" },
	{ name: "Elisa Rocha", email: "elisa@horizonte.test" },
	{ name: "Fábio Lima", email: "fabio@horizonte.test" },
	{ name: "Gabriela Souza", email: "gabriela@horizonte.test" },
	{ name: "Heitor Barros", email: "heitor@horizonte.test" },
	{ name: "Igor Pereira", email: "igor@vertice.test" },
	{ name: "Júlia Nunes", email: "julia@vertice.test" },
	{ name: "Lucas Ferraz", email: "lucas@vertice.test" },
	{ name: "Karina Duarte", email: "karina@alfa.test" },
	{ name: "Helena Martins", email: "helena@consultoria.test" },
];

export const organizations: SeedOrganization[] = [
	{
		name: "Construtora Horizonte",
		licenses: [1000, 200],
		members: [
			{ email: "ana@horizonte.test", role: "admin" },
			{ email: "bruno@horizonte.test", role: "admin" },
			{ email: "carla@horizonte.test", role: "manager" },
			{ email: "diego@horizonte.test", role: "manager" },
			{ email: "elisa@horizonte.test", role: "assistant" },
			{ email: "fabio@horizonte.test", role: "assistant" },
			{ email: "gabriela@horizonte.test", role: "assistant" },
			{ email: "heitor@horizonte.test", role: "assistant" },
			{ email: "helena@consultoria.test", role: "assistant" },
		],
		projects: [
			{
				name: "Residencial Jardins",
				reservedUnits: 120,
				members: [
					{ email: "carla@horizonte.test", role: "manager" },
					{ email: "diego@horizonte.test", role: "assistant" },
					{ email: "elisa@horizonte.test", role: "assistant" },
					{ email: "helena@consultoria.test", role: "assistant" },
				],
			},
			{
				name: "Edifício Aurora",
				reservedUnits: 90,
				members: [
					{ email: "carla@horizonte.test", role: "manager" },
					{ email: "diego@horizonte.test", role: "manager" },
					{ email: "elisa@horizonte.test", role: "assistant" },
					{ email: "fabio@horizonte.test", role: "assistant" },
				],
			},
			{ name: "Galpão Logístico Sul", reservedUnits: 20, members: [] },
			{
				name: "Condomínio Porto Belo",
				reservedUnits: 80,
				members: [{ email: "diego@horizonte.test", role: "manager" }],
			},
			{ name: "Jardim das Acácias · Torre B", reservedUnits: 60, members: [] },
			{ name: "Residencial Ipê Amarelo", reservedUnits: 50, members: [] },
			{ name: "Edifício Maré Alta", reservedUnits: 70, members: [] },
			{ name: "Parque das Águas · Fase 2", reservedUnits: 80, members: [] },
			{ name: "Villa Toscana", reservedUnits: 40, members: [] },
			{ name: "Edifício Solar do Campo", reservedUnits: 60, members: [] },
			{ name: "Residencial Jequitibá", reservedUnits: 50, members: [] },
			{ name: "Condomínio Recanto Verde", reservedUnits: 50, members: [] },
			{ name: "Edifício Pátio Central", reservedUnits: 60, members: [] },
			{ name: "Torre Atlântica", reservedUnits: 80, members: [] },
			{
				name: "Residencial Vila Nova",
				reservedUnits: 0,
				status: "delivered",
				members: [
					{ email: "carla@horizonte.test", role: "manager" },
					{ email: "heitor@horizonte.test", role: "assistant" },
				],
			},
			{
				name: "Edifício Lagoa Azul",
				reservedUnits: 0,
				status: "delivered",
				members: [{ email: "heitor@horizonte.test", role: "assistant" }],
			},
			{
				name: "Condomínio Bela Vista",
				reservedUnits: 0,
				status: "delivered",
				members: [],
			},
		],
	},
	{
		name: "Vértice Engenharia",
		licenses: [300],
		members: [
			{ email: "igor@vertice.test", role: "admin" },
			{ email: "julia@vertice.test", role: "manager" },
			{ email: "lucas@vertice.test", role: "manager" },
		],
		projects: [
			{
				// same name as a Horizonte project, on purpose: proves tenant isolation reads organization_id
				name: "Residencial Jardins",
				reservedUnits: 180,
				members: [
					{ email: "julia@vertice.test", role: "manager" },
					{ email: "lucas@vertice.test", role: "assistant" },
				],
			},
			{
				name: "Torre Ipê",
				reservedUnits: 120,
				members: [{ email: "lucas@vertice.test", role: "manager" }],
			},
		],
	},
	{
		name: "Alfa Construções",
		licenses: [500],
		members: [{ email: "karina@alfa.test", role: "admin" }],
		projects: [],
	},
];
