import { defineConfig as defineTanStackConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function stripSlash(url: string): string {
  return String(url || "").replace(/\/+$/, "");
}

function listenToBrowserOrigin(listenUrl: string): string {
  const value = stripSlash(listenUrl);
  if (!value) return "http://localhost:5050";
  try {
    const parsed = new URL(value);
    if (parsed.hostname === "0.0.0.0" || parsed.hostname === "::" || parsed.hostname === "[::]") {
      parsed.hostname = "localhost";
    }
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return stripSlash(parsed.toString());
  } catch {
    return value.replace(/:\/\/0\.0\.0\.0/gi, "://localhost");
  }
}

function readUrls(filePath: string): { backendListen: string; frontendApiBaseUrl: string } | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      backendListen: String(parsed.backendListen || "").trim().replace(/\/+$/, ""),
      frontendApiBaseUrl: String(parsed.frontendApiBaseUrl || "").trim().replace(/\/+$/, ""),
    };
  } catch {
    return null;
  }
}

const crmBuildRoot = stripSlash(
  process.env.CRM_APPOINTZA_BUILD_OUT || "D:/aravindan/build/crmappointza",
).replace(/\\/g, "/");

/** Local Vite outDir so SPA prerender can resolve node_modules; then we copy client → wwwroot. */
const kestrelDistDir = path.resolve(__dirname, ".kestrel-dist");

/** Set by build-crmappointza.ps1 — static SPA for Kestrel wwwroot, not Cloudflare Workers. */
const isCrmAppointzaBuild = Boolean(process.env.CRM_APPOINTZA_BUILD_OUT);

function hasTanStackBootstrap(html: string): boolean {
  return html.includes("$_TSR") || html.includes("__TSR");
}

function mergeClientIntoWwwroot(wwwrootOutDir: string) {
  const distClient = path.join(kestrelDistDir, "client");
  const nestedClient = path.join(wwwrootOutDir, "client");
  const clientDir = fs.existsSync(distClient) ? distClient : nestedClient;

  if (!fs.existsSync(clientDir)) {
    throw new Error(`Missing client output after UI build (${clientDir}).`);
  }

  fs.mkdirSync(wwwrootOutDir, { recursive: true });
  for (const name of fs.readdirSync(wwwrootOutDir)) {
    fs.rmSync(path.join(wwwrootOutDir, name), { recursive: true, force: true });
  }

  for (const name of fs.readdirSync(clientDir)) {
    if (name === "crmappointza-urls.json") continue;
    const src = path.join(clientDir, name);
    const dest = path.join(wwwrootOutDir, name);
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  const rootIndex = path.join(wwwrootOutDir, "index.html");
  const shellCandidates = [
    path.join(wwwrootOutDir, "_shell.html"),
    path.join(clientDir, "_shell.html"),
    path.join(clientDir, "index.html"),
    rootIndex,
  ];

  let shellHtml: string | null = null;
  for (const candidate of shellCandidates) {
    if (!fs.existsSync(candidate)) continue;
    const html = fs.readFileSync(candidate, "utf8");
    if (hasTanStackBootstrap(html)) {
      shellHtml = html;
      break;
    }
  }

  if (!shellHtml) {
    throw new Error(
      "TanStack Start SPA shell is missing window.$_TSR bootstrap. Enable spa: { enabled: true } and do not overwrite index.html.",
    );
  }

  fs.writeFileSync(rootIndex, shellHtml, "utf8");
  for (const extra of ["_shell.html", "server"]) {
    fs.rmSync(path.join(wwwrootOutDir, extra), { recursive: true, force: true });
  }
  fs.rmSync(kestrelDistDir, { recursive: true, force: true });
}

export default defineTanStackConfig({
  cloudflare: isCrmAppointzaBuild ? false : undefined,
  tanstackStart: isCrmAppointzaBuild
    ? {
        spa: { enabled: true },
        client: { base: "/" },
      }
    : undefined,
  vite: {
    server: {
      proxy: (() => {
        const urlsBuildPath = path.resolve(crmBuildRoot, "crmappointza-urls.json");
        const urlsPublicPath = path.resolve(__dirname, "public/crmappointza-urls.json");
        const urls =
          readUrls(urlsBuildPath) ||
          readUrls(urlsPublicPath) || { backendListen: "http://0.0.0.0:5053", frontendApiBaseUrl: "" };
        const target = listenToBrowserOrigin(urls.backendListen || "http://0.0.0.0:5053");
        return {
          ["/crmappointza-urls.json"]: { target, changeOrigin: true },
          "/auth": { target, changeOrigin: true },
          "/leads": { target, changeOrigin: true },
          "/organizations": { target, changeOrigin: true },
          "/dashboard": { target, changeOrigin: true },
          "/billing": { target, changeOrigin: true },
          "/users": { target, changeOrigin: true },
          "/templates": { target, changeOrigin: true },
          "/campaigns": { target, changeOrigin: true },
          "/tenants": { target, changeOrigin: true },
          "/webhooks": { target, changeOrigin: true },
          "/whatsapp": { target, changeOrigin: true },
          "/health": { target, changeOrigin: true },
          "/api-info": { target, changeOrigin: true },
        };
      })(),
    },
    build: {
      outDir: isCrmAppointzaBuild ? kestrelDistDir : path.resolve(crmBuildRoot, "wwwroot"),
      emptyOutDir: true,
    },
    plugins: [
      {
        name: "crmappointza-urls-single-file",
        apply: "build",
        enforce: "post",
        // After TanStack Start prerenders the SPA shell (_shell.html with window.$_TSR).
        buildApp: {
          order: "post",
          sequential: true,
          async handler() {
            const wwwrootOutDir = path.resolve(`${crmBuildRoot}/wwwroot`);
            const urlsBuildPath = path.resolve(crmBuildRoot, "crmappointza-urls.json");
            const urlsPublicPath = path.resolve(__dirname, "public/crmappointza-urls.json");
            if (isCrmAppointzaBuild) {
              mergeClientIntoWwwroot(wwwrootOutDir);
            }
            fs.rmSync(path.join(wwwrootOutDir, "crmappointza-urls.json"), { force: true });
            if (!fs.existsSync(urlsBuildPath) && fs.existsSync(urlsPublicPath)) {
              fs.mkdirSync(path.dirname(urlsBuildPath), { recursive: true });
              fs.copyFileSync(urlsPublicPath, urlsBuildPath);
            }
            console.log("");
            console.log(`[crmappointza] URL config: ${urlsBuildPath}`);
            console.log("");
          },
        },
      },
    ],
  },
});
