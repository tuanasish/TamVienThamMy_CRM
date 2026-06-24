import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "system-config.json");

export function getMaintenanceStatus(): boolean {
  try {
    if (!fs.existsSync(configPath)) {
      return false;
    }
    const data = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(data);
    return !!config.maintenance;
  } catch (e) {
    console.error("Error reading system config:", e);
    return false;
  }
}

export function setMaintenanceStatus(status: boolean) {
  try {
    const config = { maintenance: status, updatedAt: new Date().toISOString() };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing system config:", e);
  }
}
