import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { DATABASE, Database } from "../db/database.module";
import { Env } from "../lib/env";
import { createAuth } from "./auth";
import { SignupProvisioning } from "./signup-provisioning";
import { SignupProvisioningModule } from "./signup-provisioning.module";

/** Also registers a global AuthGuard and re-adds the body parsers nestApplicationOptions turns off. */
@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			imports: [SignupProvisioningModule],
			inject: [DATABASE, ConfigService, SignupProvisioning],
			useFactory: (
				db: Database,
				config: ConfigService<Env, true>,
				provisioning: SignupProvisioning,
			) => ({
				auth: createAuth(db, {
					secret: config.get("BETTER_AUTH_SECRET", { infer: true }),
					baseURL: config.get("BETTER_AUTH_URL", { infer: true }),
					trustedOrigins: [config.get("CORS_ORIGIN", { infer: true })],
					allowSelfSignup: config.get("ALLOW_SELF_SIGNUP", { infer: true }),
					checkBreachedPasswords: config.get("PASSWORD_BREACH_CHECK", {
						infer: true,
					}),
					onUserCreated: (user) => provisioning.provisionOrDiscard(user),
				}),
				// without this, the module re-calls enableCors during init and overrides configureApp's CORS
				disableTrustedOriginsCors: true,
			}),
		}),
	],
	exports: [BetterAuthModule],
})
export class AuthModule {}
