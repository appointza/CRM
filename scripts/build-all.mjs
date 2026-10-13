import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const npmCommand = "npm";

function runBuild(folder) {
  console.log(`\nBuilding ${folder}...\n`);
  const result = spawnSync(npmCommand, ["run", "build"], {
    cwd: join(root, folder),
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureBuildTool(folder, binaryName) {
  const extension = process.platform === "win32" ? ".cmd" : "";
  const binary = join(root, folder, "node_modules", ".bin", `${binaryName}${extension}`);

  if (existsSync(binary)) return;

  console.log(`\nInstalling build dependencies for ${folder}...\n`);
  const result = spawnSync(npmCommand, ["install"], {
    cwd: join(root, folder),
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

ensureBuildTool("connect-crm", "vite");
ensureBuildTool("connect-crm-server", "nest");

runBuild("connect-crm");
runBuild("connect-crm-server");

console.log("\nFrontend and backend production builds completed.\n");
