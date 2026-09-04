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
			// NUNCA ligar. Um `import type` no DTO de um parâmetro decorado apaga o
			// valor que o emitDecoratorMetadata grava em design:paramtypes, e a
			// injeção quebra em runtime ("Nest can't resolve dependencies (?)"),
			// não na compilação.
			"@typescript-eslint/consistent-type-imports": "off",
			// O tsc já cobre, via noUnusedLocals/noUnusedParameters.
			"@typescript-eslint/no-unused-vars": "off",
		},
	},
	{
		files: ["**/*.spec.ts"],
		languageOptions: { globals: globals.jest },
	},
	{
		// O próprio arquivo de config não está no programa do tsconfig.
		files: ["**/*.mjs"],
		extends: [tseslint.configs.disableTypeChecked],
	},
	prettier,
);
