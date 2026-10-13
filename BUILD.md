# Connect CRM (crmappointza) — Appointza-style build

One folder: **crmappointza.exe** + **wwwroot** SPA. Runtime URLs: **crmappointza-urls.json** next to the exe.

## Build

```powershell
.\build-crmappointza.ps1
D:\aravindan\build\crmappointza\run.cmd
```

| What | Path |
|------|------|
| Build script | `build-crmappointza.ps1` |
| URL template | `connect-crm/public/crmappointza-urls.json` |
| Production seed | `appointzacrmserver/crmappointza-urls.production.json` |
| **Edit after deploy** | `D:\aravindan\build\crmappointza\crmappointza-urls.json` |
| Default port | **5053** (Appointza uses 5050, Krios 5005) |

## Local dev

```powershell
.\run-dev.ps1
```
