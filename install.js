const os = require("os");
const path = require("path");
const fs = require("fs");
const platform = os.platform();
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

const ENTRYPOINT = path
    .join(process.cwd(), "dist", "patcher.js")
    .replace(/\\/g, "\\\\");

console.log("\nVencord Installer\n");

switch (platform) {
    case "win32":
        installWindows();
        break;
    case "darwin":
        console.log("MacOS");
        break;
    case "linux":
        installLinux();
        break;
    default:
        console.log("Unknown");
        break;
}

async function installWindows() {
    const installations = fs
        .readdirSync(process.env.LOCALAPPDATA)
        .filter((file) => BRANCH_NAMES.includes(file))
        .map((file) => ({
            title: path.join(process.env.LOCALAPPDATA, file),
            branchName: file,
            path: path.join(process.env.LOCALAPPDATA, file),
        }));

    const result = await menu(
        [...installations, { title: "Exit without patching", exit: true }],
        {
            header: "Select a Discord installation to patch:",
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

    console.log("Patching vencord into", result.path);

    if (!fs.existsSync(result.path)) {
        console.error("Installation path does not exist.");
        return;
    }

    if (!fs.statSync(result.path).isDirectory()) {
        console.error("Installation path is not a directory.");
        return;
    }

    installAtPath(result.path);
}

async function installLinux() {
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
        [...installations, { title: "Exit without patching", exit: true }],
        {
            header: "Select a Discord installation to patch:",
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

    console.log("Patching vencord into", result.path);

    if (!fs.existsSync(result.path)) {
        console.error("Installation path does not exist.");
        return;
    }

    if (!fs.statSync(result.path).isDirectory()) {
        console.error("Installation path is not a directory.");
        return;
    }

    installAtPath(result.path);
}

function installAtPath(discordFolder) {
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

        if (
            !fs.existsSync(resourcesDir) ||
            !fs.statSync(resourcesDir).isDirectory()
        ) {
            continue;
        }

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

        fs.mkdirSync(appPath, { recursive: true });
        fs.writeFileSync(
            path.join(appPath, "index.js"),
            `require("${ENTRYPOINT}"); require("../app.asar");`
        );
        fs.writeFileSync(
            path.join(appPath, "package.json"),
            JSON.stringify({
                name: "discord",
                main: "index.js",
            })
        );

        // Janky
        if (resourcePath.includes("flatpak")) {
            if (resourcePath.startsWith("/home/")) {
                const result = execSync(
                    `flatpak override --user com.discordapp.${version} ` +
                        `--filesystem=${process.cwd()}:rw`
                ).toString();

                if (result) console.log(result);
            } else {
                const result = execSync(
                    `sudo flatpak override com.discordapp.${version} ` +
                        `--filesystem=${process.cwd()}:rw`
                ).toString();

                if (result) console.log(result);
            }
        }

        console.log("Patched", version, "at", resourcePath);
    }
}
