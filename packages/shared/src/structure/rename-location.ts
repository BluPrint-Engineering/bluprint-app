import { z } from "zod";
import { locationNameSchema } from "./create-structure.js";

export const renameLocationSchema = z.object({
	name: locationNameSchema.meta({
		description:
			"The new name. Unique where the location sits, as when it is created, ignoring case and repeated spaces; its own current name is never a clash.",
	}),
});

export type RenameLocation = z.infer<typeof renameLocationSchema>;
