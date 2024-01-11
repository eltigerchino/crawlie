import fs from "node:fs";
import path from "node:path";

/**
 *
 * @param {string} filepath
 * @param {string} data
 */
export function write(filepath, data) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, data);
}
