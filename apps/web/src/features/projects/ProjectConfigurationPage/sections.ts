import { Building, CircleCheck, Layers, LayoutGrid } from "lucide-react";
import { STRUCTURE_SECTION_ID, UNIT_TYPES_SECTION_ID } from "../../structure";

export const SECTION_ID = {
	details: "dados-da-obra",
	status: "status-da-obra",
	structure: STRUCTURE_SECTION_ID,
	unitTypes: UNIT_TYPES_SECTION_ID,
} as const;

export const SECTIONS = [
	{ id: SECTION_ID.details, label: "Dados da obra", Icon: Building },
	{ id: SECTION_ID.status, label: "Status da obra", Icon: CircleCheck },
	{ id: SECTION_ID.structure, label: "Estrutura", Icon: Layers },
	{ id: SECTION_ID.unitTypes, label: "Tipologias", Icon: LayoutGrid },
] as const;
