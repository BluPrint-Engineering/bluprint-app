import type {
	DefaultRole,
	EffectiveRole,
	ProjectStatus,
} from "@bluprint/shared";
import { type SeedStructure, numberedFloors } from "./seed-structure";

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
	reservedUnits: number;
	status?: ProjectStatus | undefined;
	members: SeedProjectMember[];
	structure?: SeedStructure;
}

export interface SeedOrganization {
	name: string;
	licenses: number[];
	members: SeedOrgMember[];
	projects: SeedProject[];
}

const casaMoinhos: SeedStructure = {
	commonAreas: ["Guarita"],
	towers: [
		{
			name: "Torre A",
			commonAreas: ["Salão de festas"],
			floors: [
				{ name: "Subsolo", units: [], commonAreas: ["Garagem"] },
				{ name: "Térreo", units: [], commonAreas: ["Hall de entrada"] },
				...numberedFloors({ from: 1, to: 12, unitsPerFloor: 4, hall: true }),
				{
					name: "Cobertura",
					units: ["1301", "1302"],
					commonAreas: ["Terraço"],
				},
			],
		},
		{
			name: "Torre B",
			floors: numberedFloors({ from: 1, to: 10, unitsPerFloor: 2, hall: true }),
		},
	],
};

const edificioAurora: SeedStructure = {
	commonAreas: ["Salão de festas e espaço gourmet com churrasqueira coberta"],
	towers: [
		{
			name: "Torre A",
			floors: [
				{ name: "Térreo", units: [], commonAreas: ["Hall de entrada"] },
				...numberedFloors({
					from: 1,
					to: 8,
					unitsPerFloor: 3,
					numbering: "letters",
				}),
			],
		},
	],
};

const parqueDasAguas: SeedStructure = {
	towers: ["Torre A", "Torre B", "Torre C"].map((name) => ({
		name,
		floors: [
			{ name: "Térreo", units: [], commonAreas: ["Hall de entrada"] },
			...numberedFloors({ from: 1, to: 21, unitsPerFloor: 8 }),
		],
	})),
};

const condominioPortoBelo: SeedStructure = {
	towers: [
		{
			name: "Torre A",
			floors: numberedFloors({ from: 1, to: 4, unitsPerFloor: 4 }),
		},
		{ name: "Torre B", floors: [], commonAreas: ["Salão de festas"] },
	],
};

const vilaNova: SeedStructure = {
	commonAreas: ["Guarita"],
	towers: ["Torre A", "Torre B"].map((name) => ({
		name,
		floors: [
			{ name: "Térreo", units: [], commonAreas: ["Hall de entrada"] },
			...numberedFloors({ from: 1, to: 3, unitsPerFloor: 2 }),
		],
	})),
};

const verticeJardins: SeedStructure = {
	towers: [
		{
			name: "Torre A",
			floors: numberedFloors({ from: 1, to: 3, unitsPerFloor: 2 }),
		},
	],
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
		licenses: [1000, 200, 300],
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
				structure: casaMoinhos,
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
				structure: edificioAurora,
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
				structure: condominioPortoBelo,
				members: [{ email: "diego@horizonte.test", role: "manager" }],
			},
			{ name: "Jardim das Acácias · Torre B", reservedUnits: 60, members: [] },
			{ name: "Residencial Ipê Amarelo", reservedUnits: 50, members: [] },
			{ name: "Edifício Maré Alta", reservedUnits: 70, members: [] },
			{
				name: "Parque das Águas · Fase 2",
				reservedUnits: 520,
				structure: parqueDasAguas,
				members: [],
			},
			{ name: "Villa Toscana", reservedUnits: 40, members: [] },
			{ name: "Edifício Solar do Campo", reservedUnits: 60, members: [] },
			{ name: "Residencial Jequitibá", reservedUnits: 50, members: [] },
			{ name: "Condomínio Recanto Verde", reservedUnits: 50, members: [] },
			{ name: "Edifício Pátio Central", reservedUnits: 60, members: [] },
			{ name: "Torre Atlântica", reservedUnits: 80, members: [] },
			{
				name: "Residencial Vila Nova",
				reservedUnits: 12,
				status: "delivered",
				structure: vilaNova,
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
		licenses: [126],
		members: [
			{ email: "igor@vertice.test", role: "admin" },
			{ email: "julia@vertice.test", role: "manager" },
			{ email: "lucas@vertice.test", role: "manager" },
		],
		projects: [
			{
				// same name as a Horizonte project, on purpose: proves tenant isolation reads organization_id
				name: "Residencial Jardins",
				reservedUnits: 6,
				structure: verticeJardins,
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
