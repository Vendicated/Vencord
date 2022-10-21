/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const path = require("path");
const fs = require("fs");

console.log("\nVencord Uninstaller\n");

if (!fs.existsSync(path.join(process.cwd(), "node_modules"))) {
    console.log("You need to install dependencies first. Run:", "pnpm install --frozen-lockfile");
    process.exit(1);
}

const {
    getMenuItem,
    getWindowsDirs,
    getDarwinDirs,
    getLinuxDirs,
} = require("./common");

switch (process.platform) {
    case "win32":
        uninstall(getWindowsDirs());
        break;
    case "darwin":
        uninstall(getDarwinDirs());
        break;
    case "linux":
        uninstall(getLinuxDirs());
        break;
    default:
        console.log("Unknown OS");
        break;
}

async function uninstall(installations) {
    const selected = await getMenuItem(installations);

    for (const version of selected.versions) {
        const dir = version.path;
        // Check if we have write perms to the install directory...
        try {
            fs.accessSync(selected.location, fs.constants.W_OK);
        } catch (e) {
            console.error("No write access to", selected.location);
            console.error(
                "Try running this script as an administrator:",
                "sudo pnpm uninject"
            );
            process.exit(1);
        }
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true });
        }
        console.log(
            "Successfully unpatched",
            version.name
                ? `${selected.branch} ${version.name}`
                : selected.branch
        );
    }
}
