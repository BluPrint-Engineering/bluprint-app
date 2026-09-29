import { createHash, timingSafeEqual } from "node:crypto";
import { NextFunction, Request, RequestHandler, Response } from "express";
import {
	instanceOf,
	PROBLEM_JSON,
	problemDetails,
} from "../problems/problem-details";

export const PROXY_SECRET_HEADER = "x-proxy-secret";
/** Set by the Pages function from CF-Connecting-IP; trustworthy only behind this gate. */
export const CLIENT_IP_HEADER = "x-client-ip";

const HEALTH_PATH = "/api/health";

/** Registered before app.init() so it also runs ahead of Better Auth's /api/auth/* handler. */
export function proxyGate(secret: string): RequestHandler {
	const expected = digest(secret);

	return (req: Request, res: Response, next: NextFunction) => {
		// Fly's health check cannot send the secret without publishing it in fly.toml
		if (req.method === "GET" && req.path === HEALTH_PATH) return next();

		const received = req.header(PROXY_SECRET_HEADER);
		if (received !== undefined && timingSafeEqual(digest(received), expected)) {
			return next();
		}

		res
			.status(403)
			.type(PROBLEM_JSON)
			.json(
				problemDetails({
					status: 403,
					code: "NOT_FROM_PROXY",
					detail: "Requests must come through the web app's proxy",
					instance: instanceOf(req.originalUrl),
				}),
			);
	};
}

/** Hashing first gives timingSafeEqual equal-length inputs, so a length mismatch leaks nothing either. */
function digest(value: string): Buffer {
	return createHash("sha256").update(value).digest();
}
