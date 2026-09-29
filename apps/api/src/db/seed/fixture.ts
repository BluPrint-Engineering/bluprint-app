import type {
	DefaultRole,
	EffectiveRole,
	ProjectStatus,
} from "@bluprint/shared";

export const SEED_PASSWORD = "canteiro-de-obras-azul";

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
	status?: ProjectStatus | undefined;
	members: SeedProjectMember[];
}

interface SeedOrganization {
	name: string;
	// total inserted; each project below consumes one, the rest is the free-license count
	licenses: number;
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
		licenses: 19,
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
				members: [
					{ email: "carla@horizonte.test", role: "manager" },
					{ email: "diego@horizonte.test", role: "assistant" },
					{ email: "elisa@horizonte.test", role: "assistant" },
					{ email: "helena@consultoria.test", role: "assistant" },
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
			{ name: "Galpão Logístico Sul", members: [] },
			{
				name: "Condomínio Porto Belo",
				members: [{ email: "diego@horizonte.test", role: "manager" }],
			},
			{ name: "Jardim das Acácias · Torre B", members: [] },
			{ name: "Residencial Ipê Amarelo", members: [] },
			{ name: "Edifício Maré Alta", members: [] },
			{ name: "Parque das Águas · Fase 2", members: [] },
			{ name: "Villa Toscana", members: [] },
			{ name: "Edifício Solar do Campo", members: [] },
			{ name: "Residencial Jequitibá", members: [] },
			{ name: "Condomínio Recanto Verde", members: [] },
			{ name: "Edifício Pátio Central", members: [] },
			{ name: "Torre Atlântica", members: [] },
			{
				name: "Residencial Vila Nova",
				status: "delivered",
				members: [
					{ email: "carla@horizonte.test", role: "manager" },
					{ email: "heitor@horizonte.test", role: "assistant" },
				],
			},
			{
				name: "Edifício Lagoa Azul",
				status: "delivered",
				members: [{ email: "heitor@horizonte.test", role: "assistant" }],
			},
			{ name: "Condomínio Bela Vista", status: "delivered", members: [] },
		],
	},
	{
		name: "Vértice Engenharia",
		licenses: 2,
		members: [
			{ email: "igor@vertice.test", role: "admin" },
			{ email: "julia@vertice.test", role: "manager" },
			{ email: "lucas@vertice.test", role: "manager" },
		],
		projects: [
			{
				// same name as a Horizonte project, on purpose: proves tenant isolation reads organization_id
				name: "Residencial Jardins",
				members: [
					{ email: "julia@vertice.test", role: "manager" },
					{ email: "lucas@vertice.test", role: "assistant" },
				],
			},
			{
				name: "Torre Ipê",
				members: [{ email: "lucas@vertice.test", role: "manager" }],
			},
		],
	},
	{
		name: "Alfa Construções",
		licenses: 3,
		members: [{ email: "karina@alfa.test", role: "admin" }],
		projects: [],
	},
];
