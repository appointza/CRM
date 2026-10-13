# Using `appointzacrmserver` as the Connect CRM backend

You chose **`appointzacrmserver/crmappointza`** (.NET 8) instead of **`connect-crm-server`** (NestJS). This doc is the integration map.

## What you have today

| Piece | Location | Role |
|--------|-----------|------|
| **React CRM UI** | `connect-crm/` | Expects **Nest-style REST** + **JWT** (`crmApi.js`) |
| **.NET API (legacy)** | `crmappointza/crmappointza/` | **`POST /api/Lead/Select`**, `{ "item": … }` — Campusza pattern |
| **Host** | `crmappointza/Program.cs` | Kestrel, CORS, **wwwroot** SPA fallback, Swagger, `/health` |
| **Production build** | `D:\aravindan\build\crmappointza` | Run **`build-crmappointza.ps1`** (Appointza/Krios-style: UI + exe + one URL file) |
| **URL config** | `crmappointza-urls.json` next to `crmappointza.exe` | `backendListen` + `frontendApiBaseUrl` (two URLs); served at `/crmappointza-urls.json` |

The UI **does not** call `/api/Lead/Select`. It calls `/auth/login`, `/leads`, `/organizations/.../chat/...`, etc.

So: **appointzacrmserver can host the app**, but you still need a **Connect-compatible API surface** on the same process (or keep Nest on another port until that layer exists).

## Target architecture (recommended)

```
Browser → http://localhost:5050/
          ├── /app/*     → React (wwwroot, built from connect-crm)
          ├── /auth/*    → Connect REST (JWT, same as Nest)
          ├── /leads/*   → Connect REST
          ├── /webhooks/*→ Meta WhatsApp/Facebook
          └── /api/*     → Optional legacy admin APIs (existing controllers)
```

Reference implementation to mirror: **`connect-crm-server/src`** (routes + services + entities).

## Database

Use the **same Postgres database as Nest**: **`crma`**, with tables `users`, `leads`, `organizations`, `channel_configurations`, `inbound_messages`, etc.

In **`crmappointza/appsettings.json`** (or production secrets):

```json
"ApplicationSettings": {
  "postgresqlconnection": "Host=localhost;Port=5432;Database=crma;Username=postgres;Password=YOUR_PASSWORD",
  "jwtsecret": "same-long-secret-as-connect-crm-server-JWT_SECRET",
  "baseUrl": "http://localhost:5050"
}
```

**Password hashing:** Connect CRM users in `crma` use **bcrypt** (`connect-crm-server`). The existing `UserService.Login` in this repo uses **SHA256** — that is for a different user model. Connect login must use **bcrypt**, like Nest.

## Frontend configuration

**Dev** (UI on Vite, API on .NET):

`connect-crm/.env`:

```env
VITE_API_BASE_URL=http://localhost:5050
```

**Production** (single port): build UI into `crmappointza/wwwroot`, omit `VITE_API_BASE_URL` so the browser uses same origin.

Build UI from repo root:

```powershell
cd "D:\aravindan\project\appointza crm\connect-crm"
npm run build
# copy dist/client/* → appointzacrmserver/crmappointza/wwwroot/
```

## Run the .NET server

**Development:**

```powershell
cd "D:\aravindan\project\appointza crm\appointzacrmserver\crmappointza"
dotnet run
```

Default listen: **`http://0.0.0.0:5050`** (see `appsettings.json` / `ASPNETCORE_URLS`).

**Production:**

```powershell
cd "D:\aravindan\project\appointza crm"
.\build-crmappointza.ps1
# Deploy folder: D:\aravindan\build\crmappointza (default -OutDir)
```

Builds **connect-crm** + publishes **crmappointza** and writes **`crmappointza-urls.json`**.

## Environment (Meta / production)

Same as Nest — set on the server process:

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | JWT (or `ApplicationSettings:jwtsecret`) |
| `PUBLIC_API_BASE_URL` | e.g. `https://crm.appointza.com` |
| `CORS_ORIGINS` | e.g. `https://crm.appointza.com` |
| `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET` | WhatsApp webhooks |
| `FACEBOOK_VERIFY_TOKEN` | Messenger webhooks |

## Work checklist (Connect parity on .NET)

Implemented under `crmappointza/Connect/` (JWT + Nest-style routes) and table APIs under `crmappointza/crmappointza/`:

- [x] JWT Bearer + `POST /auth/login`, `/auth/register`, `GET /auth/organizations` (bcrypt, same DB as Nest)
- [x] `/leads`, `/organizations`, `/dashboard`, `/billing`, `/campaigns`, `/templates`, `/users`, `/tenants`
- [x] Org nested: `channel-config`, `reference-values`, `lead-groups`, `api-keys`, `inbox`, `chat/*`
- [x] Table APIs: `facebook_inbound_messages`, `Lead/BulkInsert|Transition|AddNote`, reference seed
- [x] `GET /api-info`, webhook verify stubs at `/webhooks/*`
- [ ] Full Meta webhook ingest + WhatsApp/Facebook send + campaign Meta send (still stubs / simplified)

Run `scripts/crma-schema-patch.sql` on Postgres if columns/tables are missing.

Until Meta/send parity is done, **chat/campaigns against real Meta** may differ from Nest.

## What you can use now (without Connect layer)

- Swagger: `http://localhost:5050/swagger` — legacy **`/api/Organization`**, **`/api/Lead`**, etc.
- Direct SQL-backed CRUD via `ActionReq` / `ActionRes`
- Static site from `wwwroot` if you copy a built SPA there

## Relation to `connect-crm-server`

| | Nest `connect-crm-server` | `appointzacrmserver` (today) |
|--|---------------------------|------------------------------|
| UI ready | Yes | After Connect REST + wwwroot |
| API for UI | Yes | No (legacy `/api/*` only) |
| Webhooks | Yes | Not wired yet on .NET |

You can run **Nest on 3000** for the UI while **building out Connect on .NET on 5050**, then switch `VITE_API_BASE_URL` once parity is verified.

## Next step

Implement the **`connect/`** REST module on `crmappointza` (same routes as `connect-crm-server`). Say if you want that as the next task — auth + leads + channel-config + chat + webhooks first.
