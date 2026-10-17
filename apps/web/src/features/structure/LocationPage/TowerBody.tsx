import type { StructureTower } from "@bluprint/shared";
import { Layers } from "lucide-react";
import { StateBlock } from "@/components/StateBlock";
import { Facade, FacadeCard } from "../components/Facade";
import { LocationList } from "../components/LocationList";

export function TowerBody({
	projectId,
	tower,
}: {
	projectId: string;
	tower: StructureTower;
}) {
	const areas = (
		<LocationList
			projectId={projectId}
			title="Áreas comuns da torre"
			items={tower.commonAreas}
		/>
	);

	if (tower.floors.length === 0) {
		return (
			<div className="grid gap-(--space-6)">
				<StateBlock
					icon={Layers}
					title={`A ${tower.name} ainda não tem andares`}
					description="Os andares aparecem aqui quando alguém da equipe adicionar."
				/>
				{tower.commonAreas.length > 0 && areas}
			</div>
		);
	}

	return (
		<div
			className={
				tower.commonAreas.length > 0
					? "grid gap-(--space-6) md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-(--space-8)"
					: "grid gap-(--space-6)"
			}
		>
			<section aria-label="Fachada" className="min-w-0">
				<FacadeCard>
					<Facade
						projectId={projectId}
						tower={tower}
						label={`Fachada da ${tower.name}`}
						from={tower.id}
					/>
				</FacadeCard>
			</section>
			{tower.commonAreas.length > 0 && areas}
		</div>
	);
}
