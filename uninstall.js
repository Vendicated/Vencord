const os = require("os");
const path = require("path");
const fs = require("fs");
const platform = os.platform();
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

const LINUX_DISCORD_DIRS = [
    "/usr/share",
    "/usr/lib64",
    "/opt",
    `${process.env.HOME}/.local/share`,
];

const LINUX_FLATPAK_DIRS = [
    "/var/lib/flatpak/app",
    `${process.env.HOME}/.local/share/flatpak/app`,
];

console.log("\nVencord Uninstaller\n");

switch (platform) {
    case "win32":
        uninstallWindows();
        break;
    case "darwin":
        console.log("MacOS");
        break;
    case "linux":
        uninstallLinux();
        break;
    default:
        console.log("Unknown");
        break;
}

async function uninstallWindows() {
    const installations = fs
        .readdirSync(process.env.LOCALAPPDATA)
        .filter((file) => BRANCH_NAMES.includes(file))
        .map((file) => ({
            title: path.join(process.env.LOCALAPPDATA, file),
            branchName: file,
            path: path.join(process.env.LOCALAPPDATA, file),
        }));

    const result = await menu(
        [...installations, { title: "Exit without unpatching", exit: true }],
        {
            header: "Select a Discord installation to unpatch:",
            border: true,
            helpMessage:
                "Use the up/down arrow keys to select an option. " +
                "Press ENTER to confirm.",
        }
    );

    if (!result || result.exit) {
        console.log("No installation selected.");
        return;
    }

    console.log("Removing vencord from", result.path);

    if (!fs.existsSync(result.path)) {
        console.log("Installation path does not exist.");
        return;
    }

    if (!fs.statSync(result.path).isDirectory()) {
        console.log("Installation path is not a directory.");
        return;
    }

    uninstallAtPath(result.path);
}

async function uninstallLinux() {
    const installations = [];

    for (const dir of LINUX_DISCORD_DIRS) {
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            continue;
        }
        for (const file of fs.readdirSync(dir)) {
            if (BRANCH_NAMES.includes(file)) {
                installations.push({
                    title: path.join(dir, file),
                    branchName: file,
                    path: path.join(dir, file),
                });
            }
        }
    }

    for (const dir of LINUX_FLATPAK_DIRS) {
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            continue;
        }
        for (const file of fs.readdirSync(dir)) {
            if (!BRANCH_NAMES.includes(file)) continue;

            const flatpakDir = path.join(
                dir,
                file,
                "current",
                "active",
                "files"
            );

            if (!fs.existsSync(flatpakDir)) continue;
            if (!fs.statSync(flatpakDir).isDirectory()) continue;

            const discordDir = fs
                .readdirSync(flatpakDir)
                .find((file) => BRANCH_NAMES.includes(file));

            if (!discordDir) continue;

            installations.push({
                title: path.join(dir, file),
                branchName: file,
                path: path.join(flatpakDir, discordDir),
            });
        }
    }

    const result = await menu(
        [...installations, { title: "Exit without unpatching", exit: true }],
        {
            header: "Select a Discord installation to unpatch:",
            border: true,
            helpMessage:
                "Use the up/down arrow keys to select an option. " +
                "Press ENTER to confirm.",
        }
    );

    if (!result || result.exit) {
        console.log("No installation selected.");
        return;
    }

    console.log("Removing vencord from", result.path);

    if (!fs.existsSync(result.path)) {
        console.log("Installation path does not exist.");
        return;
    }

    if (!fs.statSync(result.path).isDirectory()) {
        console.log("Installation path is not a directory.");
        return;
    }

    uninstallAtPath(result.path);
}

function uninstallAtPath(discordFolder) {
    const appDirs = [];
    for (let dir of fs.readdirSync(discordFolder)) {
        if (!/app-[0-9\.]+/.test(dir) && dir !== "resources") continue;

        let version = /app-[0-9\.]+/.test(dir)
            ? dir.replace("app-", "")
            : discordFolder.split(path.sep).pop();

        if (discordFolder.includes("flatpak")) {
            version =
                /(DiscordPTB|DiscordCanary|DiscordDevelopment|Discord)/.exec(
                    discordFolder
                )[1];
        }

        let resourcesDir =
            dir === "resources"
                ? path.join(discordFolder, "resources")
                : path.join(discordFolder, dir, "resources");

        if (!fs.existsSync(resourcesDir)) continue;
        if (!fs.statSync(resourcesDir).isDirectory()) continue;

        appDirs.push({
            version,
            path: resourcesDir,
            flatpak: discordFolder.includes("flatpak"),
        });
    }

    for (const { version, path: resourcePath } of appDirs) {
        const appPath = path.join(resourcePath, "app");
        if (!fs.existsSync(path.join(resourcePath, "app.asar"))) {
            console.error("app.asar does not exist in", resourcePath);
            continue;
        }

        if (!fs.existsSync(path.join(resourcePath, "app"))) {
            console.log("Vencord is already unpatched at", resourcePath);
            continue;
        }

        fs.rmSync(appPath, { recursive: true, force: true });

        console.log("Unpatched", version, "at", resourcePath);
    }
}
