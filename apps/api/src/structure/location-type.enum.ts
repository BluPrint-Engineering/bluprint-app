import { locationTypes } from "@bluprint/shared";
import { pgEnum } from "drizzle-orm/pg-core";

export const locationType = pgEnum("location_type", locationTypes);
