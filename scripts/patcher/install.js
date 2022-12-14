#!/usr/bin/node
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
const { execSync } = require("child_process");

console.log("\nVencord Installer\n");

if (!fs.existsSync(path.join(process.cwd(), "node_modules"))) {
    console.log("You need to install dependencies first. Run:", "pnpm install --frozen-lockfile");
    process.exit(1);
}

if (!fs.existsSync(path.join(process.cwd(), "dist", "patcher.js"))) {
    console.log("You need to build the project first. Run:", "pnpm build");
    process.exit(1);
}

const {
    getMenuItem,
    getWindowsDirs,
    getDarwinDirs,
    getLinuxDirs,
    ENTRYPOINT,
    question,
    pathToBranch
} = require("./common");

switch (process.platform) {
    case "win32":
        install(getWindowsDirs());
        break;
    case "darwin":
        install(getDarwinDirs());
        break;
    case "linux":
        install(getLinuxDirs());
        break;
    default:
        console.log("Unknown OS");
        break;
}

async function install(installations) {
    const selected = await getMenuItem(installations);

    // Attempt to give flatpak perms
    if (selected.isFlatpak) {
        try {
            const cwd = process.cwd();
            const globalCmd = `flatpak override ${selected.branch} --filesystem=${cwd}`;
            const userCmd = `flatpak override --user ${selected.branch} --filesystem=${cwd}`;
            const cmd = selected.location.startsWith("/home")
                ? userCmd
                : globalCmd;
            execSync(cmd);
            console.log("Gave write perms to Discord Flatpak.");
        } catch (e) {
            console.log("Failed to give write perms to Discord Flatpak.");
            console.log(
                "Try running this script as an administrator:",
                "sudo pnpm inject"
            );
            process.exit(1);
        }

        const answer = await question(
            `Would you like to allow ${selected.branch} to talk to org.freedesktop.Flatpak?\n` +
            "This is essentially full host access but necessary to spawn git. Without it, the updater will not work\n" +
            "Consider using the http based updater (using the gui installer) instead if you want to maintain the sandbox.\n" +
            "[y/N]: "
        );

        if (["y", "yes", "yeah"].includes(answer.toLowerCase())) {
            try {
                const globalCmd = `flatpak override ${selected.branch} --talk-name=org.freedesktop.Flatpak`;
                const userCmd = `flatpak override --user ${selected.branch} --talk-name=org.freedesktop.Flatpak`;
                const cmd = selected.location.startsWith("/home")
                    ? userCmd
                    : globalCmd;
                execSync(cmd);
                console.log("Sucessfully gave talk permission");
            } catch (err) {
                console.error("Failed to give talk permission\n", err);
            }
        } else {
            console.log(`Not giving full host access. If you change your mind later, you can run:\nflatpak override ${selected.branch} --talk-name=org.freedesktop.Flatpak`);
        }
    }

    const useNewMethod = pathToBranch(selected.branch) !== "stable";

    for (const version of selected.versions) {

        const dir = useNewMethod ? path.join(version.path, "..") : version.path;

        // Check if we have write perms to the install directory...
        try {
            fs.accessSync(selected.location, fs.constants.W_OK);
        } catch (e) {
            console.error("No write access to", selected.location);
            console.error(
                "Make sure Discord isn't running. If that doesn't work,",
                "try running this script as an administrator:",
                "sudo pnpm inject"
            );
            process.exit(1);
        }
        if (useNewMethod) {
            const appAsar = path.join(dir, "app.asar");
            const _appAsar = path.join(dir, "_app.asar");

            if (fs.existsSync(_appAsar) && fs.existsSync(appAsar)) {
                console.log("This copy of Discord already seems to be patched...");
                console.log("Try running `pnpm uninject` first.");
                process.exit(1);
            }

            try {
                fs.renameSync(appAsar, _appAsar);
            } catch (err) {
                if (err.code === "EBUSY") {
                    console.error(selected.branch, "is still running. Make sure you fully close it before running this script.");
                    process.exit(1);
                }
                console.error("Failed to rename app.asar to _app.asar");
                throw err;
            }

            try {
                fs.mkdirSync(appAsar);
            } catch (err) {
                if (err.code === "EBUSY") {
                    console.error(selected.branch, "is still running. Make sure you fully close it before running this script.");
                    process.exit(1);
                }
                console.error("Failed to create app.asar folder");
                throw err;
            }

            fs.writeFileSync(
                path.join(appAsar, "index.js"),
                `require("${ENTRYPOINT}");`
            );
            fs.writeFileSync(
                path.join(appAsar, "package.json"),
                JSON.stringify({
                    name: "discord",
                    main: "index.js",
                })
            );

            const requiredFiles = ["index.js", "package.json"];

            if (requiredFiles.every(f => fs.existsSync(path.join(appAsar, f)))) {
                console.log(
                    "Successfully patched",
                    version.name
                        ? `${selected.branch} ${version.name}`
                        : selected.branch
                );
            } else {
                console.log("Failed to patch", dir);
                console.log("Files in directory:", fs.readdirSync(appAsar));
            }

            return;
        }
        if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) {
            fs.rmSync(dir, { recursive: true });
        }
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(
            path.join(dir, "index.js"),
            `require("${ENTRYPOINT}");`
        );
        fs.writeFileSync(
            path.join(dir, "package.json"),
            JSON.stringify({
                name: "discord",
                main: "index.js",
            })
        );

        const requiredFiles = ["index.js", "package.json"];

        if (requiredFiles.every(f => fs.existsSync(path.join(dir, f)))) {
            console.log(
                "Successfully patched",
                version.name
                    ? `${selected.branch} ${version.name}`
                    : selected.branch
            );
        } else {
            console.log("Failed to patch", dir);
            console.log("Files in directory:", fs.readdirSync(dir));
        }
    }
}
