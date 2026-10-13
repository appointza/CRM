import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const root = process.cwd();
const outputArg = process.argv.find((a) => a.startsWith("--output="))?.slice("--output=".length);
const output = outputArg
  ? outputArg
  : process.env.PACKAGE_OUTPUT?.trim()
    ? process.env.PACKAGE_OUTPUT.trim()
    : join(root, "build", "appointza-crm-host");

function copy(source, destination) {
  const dest = isAbsolute(destination) ? destination : join(root, destination);
  cpSync(join(root, source), dest, {
    recursive: true,
    force: true,
  });
}

mkdirSync(join(output, "ui"), { recursive: true });
mkdirSync(join(output, "server"), { recursive: true });

copy("connect-crm/dist", join(output, "ui"));
copy("connect-crm-server/dist", join(output, "server/dist"));
copy("connect-crm-server/package.json", join(output, "server/package.json"));
copy("connect-crm-server/package-lock.json", join(output, "server/package-lock.json"));

if (existsSync(join(root, "connect-crm-server", ".env.example"))) {
  copy("connect-crm-server/.env.example", join(output, "server/.env.example"));
}

if (existsSync(join(root, "connect-crm-server", "migrations"))) {
  copy("connect-crm-server/migrations", join(output, "server/migrations"));
}

writeFileSync(
  join(output, "start-api.bat"),
  "@echo off\r\ncd /d %~dp0server\r\nnpm ci --omit=dev\r\nnode dist/main\r\n",
);

writeFileSync(
  join(output, "start.ps1"),
  [
    "$ErrorActionPreference = 'Stop'",
    "$server = Join-Path $PSScriptRoot 'server'",
    "Set-Location -LiteralPath $server",
    "if (-not (Test-Path '.\\package-lock.json')) {",
    "  throw 'Missing server\\\\package-lock.json — run npm install in connect-crm-server, or use ..\\\\build-crmappointza.ps1 for .NET deploy.'",
    "}",
    "npm ci --omit=dev",
    "if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }",
    "node dist/main",
    "",
  ].join("\r\n"),
);

writeFileSync(
  join(output, "start.sh"),
  [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'cd "$(dirname "$0")/server"',
    "npm ci --omit=dev",
    "node dist/main",
    "",
  ].join("\n"),
);

writeFileSync(
  join(output, "README.txt"),
  [
    "Appointza CRM production package (UI + API, single port)",
    "",
    "Folders:",
    "- server  NestJS API. Also serves UI from ../ui",
    "- ui      React / TanStack production build",
    "",
    "Local / EC2 run:",
    "  cd server",
    "  cp .env.example .env   # then edit values",
    "  npm ci --omit=dev",
    "  node dist/main",
    "",
    "Or: bash start.sh",
    "",
    "Open:",
    "  http://YOUR_EC2_PUBLIC_IP:3000",
    "  http://YOUR_EC2_PUBLIC_IP:3000/api-info",
    "",
    "Required server .env:",
    "  PORT=3000",
    "  LISTEN_HOST=0.0.0.0",
    "  NODE_ENV=production",
    "  PUBLIC_HOST=YOUR_EC2_PUBLIC_IP_OR_DOMAIN",
    "  PUBLIC_API_BASE_URL=https://crm.appointza.com",
    "  CORS_ORIGINS=https://crm.appointza.com",
    "  WHATSAPP_VERIFY_TOKEN=appointza_wa_verify_2026",
    "  META_APP_SECRET=your_meta_app_secret",
    "  DATABASE_HOST=...",
    "  DATABASE_PORT=5432",
    "  DATABASE_USER=...",
    "  DATABASE_PASSWORD=...",
    "  DATABASE_NAME=...",
    "  JWT_SECRET=long-random-secret",
    "",
    "EC2 security group: allow inbound TCP 3000 (and 22 for SSH).",
    "Keep PostgreSQL reachable from this instance.",
    "WhatsApp webhook: https://crm.appointza.com/webhooks/whatsapp",
    "",
    "Database migrations (run once on production Postgres before start):",
    "  server/migrations/*.sql",
    "",
    "Note: server/dist/*.d.ts files are TypeScript types only — not runtime errors.",
    "Do not upload server/node_modules from your PC; run npm ci --omit=dev on the server.",
    "",
  ].join("\r\n"),
);

console.log(`Packaged production build at ${output}`);
