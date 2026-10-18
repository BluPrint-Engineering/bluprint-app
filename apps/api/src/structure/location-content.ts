import { Injectable } from "@nestjs/common";

@Injectable()
export class LocationContent {
	hasContent(_locationIds: readonly string[]): Promise<boolean> {
		return Promise.resolve(false);
	}
}
