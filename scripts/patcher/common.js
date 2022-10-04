const path = require("path");
const readline = require("readline");
const fs = require("fs");
const menu = require("console-menu");

const BRANCH_NAMES = [
    "Discord",
    "DiscordPTB",
    "DiscordCanary",
    "DiscordDevelopment",
    "discord",
    "discordptb",
    "discordcanary",
    "discorddevelopment",
    "discord-ptb",
    "discord-canary",
    "discord-development",
    // Flatpak
    "com.discordapp.Discord",
    "com.discordapp.DiscordPTB",
    "com.discordapp.DiscordCanary",
    "com.discordapp.DiscordDevelopment",
];

const MACOS_DISCORD_DIRS = [
    "Discord.app",
    "Discord PTB.app",
    "Discord Canary.app",
    "Discord Development.app",
];

const LINUX_DISCORD_DIRS = [
    "/usr/share",
    "/usr/lib64",
    "/opt",
    `${process.env.HOME}/.local/share`,
    "/var/lib/flatpak/app",
    `${process.env.HOME}/.local/share/flatpak/app`,
];

const FLATPAK_NAME_MAPPING = {
    DiscordCanary: "discord-canary",
    DiscordPTB: "discord-ptb",
    DiscordDevelopment: "discord-development",
    Discord: "discord",
};

const ENTRYPOINT = path
    .join(process.cwd(), "dist", "patcher.js")
    .replace(/\\/g, "\\\\");

function question(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function getMenuItem(installations) {
    let menuItems = installations.map((info) => ({
        title: info.patched ? "[MODIFIED] " + info.location : info.location,
        info,
    }));

    if (menuItems.length === 0) {
        console.log("No Discord installations found.");
        process.exit(1);
    }

    const result = await menu(
        [...menuItems, { title: "Exit without patching", exit: true }],
        {
            header: "Select a Discord installation to patch:",
            border: true,
            helpMessage:
                "Use the up/down arrow keys to select an option. " +
                "Press ENTER to confirm.",
        }
    );

    if (!result || !result.info || result.exit) {
        console.log("No installation selected.");
        process.exit(0);
    }

    if (result.info.patched) {
        const answer = await question(
            "This installation has already been modified. Overwrite? [Y/n]: "
        );

        if (!["y", "yes", "yeah", ""].includes(answer.toLowerCase())) {
            console.log("Not patching.");
            process.exit(0);
        }
    }

    return result.info;
}

function getWindowsDirs() {
    const dirs = [];
    for (const dir of fs.readdirSync(process.env.LOCALAPPDATA)) {
        if (!BRANCH_NAMES.includes(dir)) continue;

        const location = path.join(process.env.LOCALAPPDATA, dir);
        if (!fs.statSync(location).isDirectory()) continue;

        const appDirs = fs
            .readdirSync(location, { withFileTypes: true })
            .filter((file) => file.isDirectory())
            .filter((file) => file.name.startsWith("app-"))
            .map((file) => path.join(location, file.name));

        let versions = [];
        let patched = false;

        for (const fqAppDir of appDirs) {
            const resourceDir = path.join(fqAppDir, "resources");
            if (!fs.existsSync(path.join(resourceDir, "app.asar"))) {
                continue;
            }
            const appDir = path.join(resourceDir, "app");
            if (fs.existsSync(appDir)) {
                patched = true;
            }
            versions.push({
                path: appDir,
                name: /app-([0-9\.]+)/.exec(fqAppDir)[1],
            });
        }

        if (appDirs.length) {
            dirs.push({
                branch: dir,
                patched,
                location,
                versions,
                arch: "win32",
                flatpak: false,
            });
        }
    }
    return dirs;
}

function getDarwinDirs() {
    const dirs = [];
    for (const dir of fs.readdirSync("/Applications")) {
        if (!MACOS_DISCORD_DIRS.includes(dir)) continue;

        const location = path.join("/Applications", dir, "Contents");
        if (!fs.existsSync(location)) continue;
        if (!fs.statSync(location).isDirectory()) continue;

        const appDirs = fs
            .readdirSync(location, { withFileTypes: true })
            .filter((file) => file.isDirectory())
            .filter((file) => file.name.startsWith("Resources"))
            .map((file) => path.join(location, file.name));

        let versions = [];
        let patched = false;

        for (const resourceDir of appDirs) {
            if (!fs.existsSync(path.join(resourceDir, "app.asar"))) {
                continue;
            }
            const appDir = path.join(resourceDir, "app");
            if (fs.existsSync(appDir)) {
                patched = true;
            }

            versions.push({
                path: appDir,
                name: null, // MacOS installs have no version number
            });
        }

        if (appDirs.length) {
            dirs.push({
                branch: dir,
                patched,
                location,
                versions,
                arch: "win32",
            });
        }
    }
    return dirs;
}

function getLinuxDirs() {
    const dirs = [];
    for (const dir of LINUX_DISCORD_DIRS) {
        if (!fs.existsSync(dir)) continue;
        for (const branch of fs.readdirSync(dir)) {
            if (!BRANCH_NAMES.includes(branch)) continue;

            const location = path.join(dir, branch);
            if (!fs.statSync(location).isDirectory()) continue;

            const isFlatpak = location.includes("/flatpak/");

            let appDirs = [];

            if (isFlatpak) {
                const fqDir = path.join(location, "current", "active", "files");
                if (!/com\.discordapp\.(\w+)\//.test(fqDir)) continue;
                const branchName = /com\.discordapp\.(\w+)\//.exec(fqDir)[1];
                if (!Object.keys(FLATPAK_NAME_MAPPING).includes(branchName)) {
                    continue;
                }
                const appDir = path.join(
                    fqDir,
                    FLATPAK_NAME_MAPPING[branchName]
                );

                if (!fs.existsSync(appDir)) continue;
                if (!fs.statSync(appDir).isDirectory()) continue;

                const resourceDir = path.join(appDir, "resources");

                appDirs.push(resourceDir);
            } else {
                appDirs = fs
                    .readdirSync(location, { withFileTypes: true })
                    .filter((file) => file.isDirectory())
                    .filter(
                        (file) =>
                            file.name.startsWith("app-") ||
                            file.name === "resources"
                    )
                    .map((file) => path.join(location, file.name));
            }

            let versions = [];
            let patched = false;

            for (const resourceDir of appDirs) {
                if (!fs.existsSync(path.join(resourceDir, "app.asar"))) {
                    continue;
                }
                const appDir = path.join(resourceDir, "app");
                if (fs.existsSync(appDir)) {
                    patched = true;
                }

                const version = /app-([0-9\.]+)/.exec(resourceDir);

                versions.push({
                    path: appDir,
                    name: version && version.length > 1 ? version[1] : null,
                });
            }

            if (appDirs.length) {
                dirs.push({
                    branch,
                    patched,
                    location,
                    versions,
                    arch: "linux",
                    isFlatpak,
                });
            }
        }
    }
    return dirs;
}

module.exports = {
    BRANCH_NAMES,
    MACOS_DISCORD_DIRS,
    LINUX_DISCORD_DIRS,
    FLATPAK_NAME_MAPPING,
    ENTRYPOINT,
    question,
    getMenuItem,
    getWindowsDirs,
    getDarwinDirs,
    getLinuxDirs,
};
