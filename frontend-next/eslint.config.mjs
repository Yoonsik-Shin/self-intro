import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
    {
        files: ['lib/markdown.tsx'],
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
    {
        // App Router has no pages/_document.js; these stylesheet links are intentionally
        // global in the root layout and include a self-hosted fallback font.
        files: ['app/layout.tsx'],
        rules: { '@next/next/no-page-custom-font': 'off' },
    },
    {
        // Experience attachments use authenticated/object-storage URLs whose hosts and
        // dimensions are not known at build time, so next/image cannot safely optimize them.
        files: ['components/experience/ExperienceDetailClient.tsx'],
        rules: { '@next/next/no-img-element': 'off' },
    },
]);

export default eslintConfig;
