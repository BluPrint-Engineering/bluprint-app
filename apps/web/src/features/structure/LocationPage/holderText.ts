import type { RoomHolder } from "./roomNames";

const HOLDERS = {
	unit: {
		the: "a unidade",
		The: "A unidade",
		inThis: "nesta unidade",
		ofThis: "desta unidade",
		inThe: "na unidade",
		typologyOf: (name: string) => `da ${name}`,
	},
	common_area: {
		the: "a área comum",
		The: "A área comum",
		inThis: "nesta área comum",
		ofThis: "desta área comum",
		inThe: "na área comum",
		typologyOf: (name: string) => `do ${name}`,
	},
} as const satisfies Record<RoomHolder, object>;

export function holderText(holder: RoomHolder) {
	const { the, The, inThis, ofThis, inThe, typologyOf } = HOLDERS[holder];
	return {
		followsTypology: (typology: string) =>
			`Os cômodos acompanham a tipologia ${typology}. O que foi mudado só ${inThis} continua assim quando a tipologia muda.`,
		ownRoomsOnly: `Os cômodos ${ofThis} são só dela.`,
		ownRoomBadge: `Só ${ofThis}`,
		ownRoomsOption: `Cômodos só ${ofThis}`,
		removeTypologyRoom: `Remover ${ofThis}`,
		droppedRooms: `Tirados ${ofThis}`,
		changeTypologyTitle: (name: string) =>
			`Trocar a tipologia ${typologyOf(name)}`,
		changeTypologyDescription: `Os cômodos passam a ser os da tipologia escolhida. Cômodo com pins continua ${inThe}.`,
		nowFollows: (name: string, typology: string) =>
			`${The} ${name} agora segue a tipologia ${typology}.`,
		leftWithoutTypology: (name: string) =>
			`${The} ${name} ficou sem tipologia.`,
		returnedToTypology: (name: string, typology: string) =>
			`${The} ${name} voltou à tipologia ${typology}.`,
		returnFailed: (name: string) =>
			`Não foi possível voltar ${the} ${name} à tipologia. Confira sua conexão e tente de novo.`,
	};
}
