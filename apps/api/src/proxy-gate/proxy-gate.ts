import { createHash, timingSafeEqual } from "node:crypto";
import { RequestHandler } from "express";
import {
	PROBLEM_JSON,
	instanceOf,
	problemDetails,
} from "../common/problems/problem-details";

const PROXY_SECRET_HEADER = "x-proxy-secret";
export const CLIENT_IP_HEADER = "x-client-ip";

const HEALTH_PATH = "/api/health";

function digest(value: string): Buffer {
	return createHash("sha256").update(value).digest();
}

/** Registered before every route, so a header it lets through is one only the Pages proxy could have set. */
export function proxyGate(secret: string): RequestHandler {
	const expected = digest(secret);

	return (req, res, next) => {
		// the host health check cannot carry the secret without publishing it in fly.toml
		if (req.method === "GET" && req.path === HEALTH_PATH) {
			next();
			return;
		}

		const presented = digest(req.get(PROXY_SECRET_HEADER) ?? "");
		if (timingSafeEqual(presented, expected)) {
			next();
			return;
		}

		res
			.status(403)
			.type(PROBLEM_JSON)
			.json(
				problemDetails({
					status: 403,
					code: "PROXY_REQUIRED",
					instance: instanceOf(req.originalUrl),
				}),
			);
	};
}
