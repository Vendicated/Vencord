const os = require("os");
const path = require("path");
const fs = require("fs");
const platform = os.platform();
const readline = require("readline");
const menu = require("console-menu");
const { execSync } = require("child_process");

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

// const LINUX_FLATPAK_DIRS = [
// ];

const ENTRYPOINT = path
    .join(process.cwd(), "dist", "patcher.js")
    .replace(/\\/g, "\\\\");

console.log("\nVencord Installer\n");

switch (platform) {
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
        console.log("Unknown");
        break;
}

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

async function install(installations) {
    const selected = await getMenuItem(installations);

    // Attempt to give flatpak perms
    if (selected.isFlatpak) {
        try {
            const branch = selected.branch;
            const cwd = process.cwd();
            const globalCmd = `flatpak override ${branch} --filesystem=${cwd}`;
            const userCmd = `flatpak override --user ${branch} --filesystem=${cwd}`;
            const cmd = selected.location.startsWith("/home")
                ? userCmd
                : globalCmd;
            execSync(cmd);
            console.log("Successfully gave write perms to Discord Flatpak.");
        } catch (e) {
            console.log("Failed to give write perms to Discord Flatpak.");
            console.log(
                "Try running this script as an administrator:",
                "sudo node install.js"
            );
            process.exit(1);
        }
    }

    for (const version of selected.versions) {
        const dir = version.path;
        // Check if we have write perms to the install directory...
        try {
            fs.accessSync(selected.location, fs.constants.W_OK);
        } catch (e) {
            console.error("No write access to", selected.location);
            console.error(
                "Try running this script as an administrator:",
                "sudo node install.js"
            );
            process.exit(1);
        }
        if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) {
            fs.rmSync(dir, { recursive: true });
        }
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(
            path.join(dir, "index.js"),
            `require("${ENTRYPOINT}"); require("../app.asar");`
        );
        fs.writeFileSync(
            path.join(dir, "package.json"),
            JSON.stringify({
                name: "discord",
                main: "index.js",
            })
        );

        const requiredFiles = ["index.js", "package.json"];

        if (requiredFiles.every((f) => fs.existsSync(path.join(dir, f)))) {
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
