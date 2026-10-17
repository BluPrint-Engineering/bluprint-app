import { Building, CircleCheck } from "lucide-react";

export const SECTION_ID = {
	details: "dados-da-obra",
	status: "status-da-obra",
} as const;

export const SECTIONS = [
	{ id: SECTION_ID.details, label: "Dados da obra", Icon: Building },
	{ id: SECTION_ID.status, label: "Status da obra", Icon: CircleCheck },
] as const;
