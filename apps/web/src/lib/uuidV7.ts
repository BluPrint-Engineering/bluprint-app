export function uuidV7(now = Date.now()): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	let timestamp = now;
	for (let i = 5; i >= 0; i--) {
		bytes[i] = timestamp % 256;
		timestamp = Math.floor(timestamp / 256);
	}
	bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
	bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
	return [
		hex.slice(0, 4),
		hex.slice(4, 6),
		hex.slice(6, 8),
		hex.slice(8, 10),
		hex.slice(10),
	]
		.map((group) => group.join(""))
		.join("-");
}
