import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist", "coverage", "bruno"] },
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			globals: globals.node,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			// Never enable: `import type` on a decorated parameter's DTO erases the
			// value emitDecoratorMetadata writes to design:paramtypes, and DI then
			// fails at runtime, not at compile time.
			"@typescript-eslint/consistent-type-imports": "off",
			// Already covered by tsc's noUnusedLocals/noUnusedParameters.
			"@typescript-eslint/no-unused-vars": "off",
		},
	},
	{
		files: ["**/*.spec.ts"],
		languageOptions: { globals: globals.jest },
	},
	{
		// This config file is not part of the tsconfig program.
		files: ["**/*.mjs"],
		extends: [tseslint.configs.disableTypeChecked],
	},
	prettier,
);
