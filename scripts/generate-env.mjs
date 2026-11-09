import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const root = new URL('../', import.meta.url);
const envFile = new URL('.env', root);
const values = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {};
const apiUrl = (process.env.API_URL ?? values.API_URL ?? 'http://localhost:8080')
  .trim().replace(/\/+$/, '');

const parsed = new URL(apiUrl);
if (!['http:', 'https:'].includes(parsed.protocol) || parsed.search || parsed.hash) {
  throw new Error('API_URL deve ser uma URL HTTP(S) sem query string ou fragmento.');
}

const directory = new URL('src/environments/', root);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('environment.ts', directory),
  `// Gerado por scripts/generate-env.mjs. Edite o .env.\nexport const environment = ${JSON.stringify({ apiUrl }, null, 2)} as const;\n`);
