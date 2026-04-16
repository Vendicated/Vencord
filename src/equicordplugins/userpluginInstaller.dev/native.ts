/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 nin0
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NativeSettings } from "@main/settings";
import { exec, spawn } from "child_process";
import { BrowserWindow, dialog, shell, WebContentsView } from "electron";
import { existsSync, readdirSync, readFileSync } from "fs";
import { readdir, readFile, rm } from "fs/promises";
import { basename, join } from "path";
import yaml from "yaml-js";

// @ts-ignore fuck off
import pluginValidateContent from "./misc/pluginValidate.txt"; // i would use HTML but esbuild is being whiny
// @ts-ignore fuck off
import setGitPathContent from "./misc/setGitPath.txt";
// @ts-ignore fuck off
import updateValidateContent from "./misc/updateValidate.txt"; // see above

const PLUGIN_META_REGEX = /export default definePlugin\((?:\s|\/(?:\/|\*).*)*{\s*(?:\s|\/(?:\/|\*).*)*name:\s*(?:"|'|`)(.*)(?:"|'|`)(?:\s|\/(?:\/|\*).*)*,(?:\s|\/(?:\/|\*).*)*(?:\s|\/(?:\/|\*).*)*description:\s*(?:"|'|`)(.*)(?:"|'|`)(?:\s|\/(?:\/|\*).*)*/;
// if edited, also edit in misc/constants.ts!!!
const CLONE_LINK_REGEX = /https:\/\/(?:((?:git(?:hub|lab)\.com|git\.(?:[a-zA-Z0-9]|\.)+|codeberg\.org))\/(?!user-attachments)((?:[a-zA-Z0-9]|-)+)\/((?:[a-zA-Z0-9]|-|\.)+)(?:\.git)?|(plugins\.(nin0)\.dev)\/((?:[a-zA-Z0-9]|-|\.)+))(?:\/)?/;

const vencordPath = ["desktop", "equibop"].includes(basename(__dirname)) ? join(__dirname, "../") : __dirname;

export async function rmPlugin(_, name: string): Promise<string> {
    // eslint-disable-next-line
    return new Promise(async (resolve, reject) => {
        const ups = await getUserplugins();
        const pl = ups.find(p => p.directory! === name);
        if (!pl) return;

        const deleteReqDialog = await dialog.showMessageBox({
            title: "Uninstall plugin",
            message: `Uninstall ${pl.name}`,
            type: "error",
            detail: `The uninstall of the userplugin ${pl.name} has been requested. Would you like to do so?\n\nIf you did not initiate this, press No.`,
            buttons: ["No", "Yes"]
        });

        if (deleteReqDialog.response !== 1) return reject("User rejected");
        await rm(join(vencordPath, "../src/userplugins", name), { recursive: true });

        await build();
        resolve("Done");
    });
}

export async function isUpdateAvailableForPlugin(_, name: string): Promise<boolean> {
    return new Promise(resolve => {
        const pluginDir = join(vencordPath, "../src/userplugins", name);
        const otherProc = exec("git fetch", {
            cwd: pluginDir
        });
        otherProc.once("close", () => {
            async function doStuff() {
                try {
                    const head = (await readFile(join(pluginDir, ".git/HEAD"), "utf8")).match(/^ref: (.+)/)![1];
                    const remoteHead = (await readFile(join(pluginDir, ".git/refs/remotes/origin/HEAD"), "utf8")).match(/^ref: (.+)/)![1];
                    const localCommit = await readFile(join(pluginDir, ".git", head), "utf8");
                    const remoteCommit = await readFile(join(pluginDir, ".git", remoteHead), "utf8");

                    resolve(localCommit !== remoteCommit);
                }
                catch (e) {
                    resolve(false);
                }
            }
            doStuff();
        });
    });
}

export function initPluginInstall(_, link: string, source: string, owner: string, repo: string): Promise<string> {
    // eslint-disable-next-line
    return new Promise(async (resolve, reject) => {
        const verifiedRegex = link.match(CLONE_LINK_REGEX)!;
        const idpl = source === "plugins.nin0.dev" ? 1 : 0;
        if (![4, 7].includes(verifiedRegex.length) || verifiedRegex[0] !== link || verifiedRegex[[1, 4][idpl]] !== source || verifiedRegex[[2, 5][idpl]] !== owner || verifiedRegex[[3, 6][idpl]] !== repo) return reject("Invalid link");

        // Ask for clone
        const cloneDialog = await dialog.showMessageBox({
            title: "Clone userplugin",
            message: `You are about to clone a userplugin from ${source}.`,
            type: "question",
            detail: `The repository name is "${repo}" and it is owned by "${owner}".\nThe repository URL is ${link}\n\n(If you did not request this intentionally, choose Cancel)`,
            buttons: ["Cancel", "Clone repository and continue install", "Open repository in browser"]
        });
        switch (cloneDialog.response) {
            case 0: {
                return reject("Rejected by user");
            }
            case 1: {
                await cloneRepo(link, repo);
                break;
            }
            case 2: {
                await shell.openExternal(link);
                return reject("silentStop");
            }
        }

        // Get plugin meta
        const meta = await getPluginMeta(join(vencordPath, "..", "src", "userplugins", repo));

        // Review plugin
        const win = new BrowserWindow({
            maximizable: false,
            minimizable: false,
            width: 560,
            height: meta.usesNative || meta.usesPreSend ? 650 : 360,
            resizable: false,
            webPreferences: {
                devTools: true
            },
            title: "Review userplugin",
            modal: true,
            parent: BrowserWindow.getAllWindows()[0],
            show: false,
            autoHideMenuBar: true
        });
        const reView /* haha got it */ = new WebContentsView({
            webPreferences: {
                devTools: true,
                nodeIntegration: true
            }
        });
        win.contentView.addChildView(reView);
        win.loadURL(generateReviewPluginContent(meta));
        win.on("page-title-updated", async e => {
            switch (win.webContents.getTitle() as "abortInstall" | "reviewCode" | "install") {
                case "abortInstall": {
                    win.close();
                    await rm(join(vencordPath, "..", "src", "userplugins", repo), {
                        recursive: true
                    });
                    return reject("Rejected by user");
                }
                case "install": {
                    win.close();
                    try {
                        await build();
                    }
                    catch (e) {
                        reject((e as Error).toString());
                    }
                    resolve(JSON.stringify({
                        name: meta.name,
                        native: meta.usesNative
                    }));
                    break;
                }
            }
        });
        win.show();
    });
}

async function build(): Promise<any> {
    return new Promise((resolve, reject) => {
        const proc = exec("pnpm build --dev", {
            cwd: join(vencordPath, ".."),
            shell: process.env.SHELL || process.env.ComSpec || "/bin/sh"
        });
        proc.once("close", () => {
            if (proc.exitCode !== 0) {
                reject("Failed to build Vencord, try building from console");
            }
            resolve("Success");
        });
    });
}

async function getPluginMeta(path: string, extra: object = {}): Promise<{
    name: string;
    description: string;
    usesPreSend: boolean;
    usesNative: boolean;
    directory?: string;
    remote: string;
    supportChannelID?: string;
}> {
    return new Promise((resolve, reject) => {
        const files = readdirSync(path);
        let fileToRead: "index.ts" | "index.tsx" | "index.js" | "index.jsx" | undefined;
        files.forEach(f => {
            if (f === "index.ts") fileToRead = "index.ts";
            if (f === "index.tsx") fileToRead = "index.tsx";
            if (f === "index.js") fileToRead = "index.js";
            if (f === "index.jsx") fileToRead = "index.jsx";
        });
        if (!fileToRead) reject("Invalid plugin");

        const file = readFileSync(`${path}/${fileToRead}`, "utf8");
        let remoteURL;
        try {
            const remoteC = readFileSync(join(path, ".git/config"), "utf8");
            remoteURL = remoteC.match(/\[remote "origin"]\s+url = (https:\/\/(?:(?:git(?:hub|lab)\.com|git\.(?:[a-zA-Z0-9]|\.)+|codeberg\.org)\/(?!user-attachments)(?:[a-zA-Z0-9]|-)+\/(?:[a-zA-Z0-9]|-|\.)+(?:\.git)?|(plugins\.(nin0)\.dev)\/((?:[a-zA-Z0-9]|-|\.)+))(?:\/)?)\n/);
        } catch {
            remoteURL = null;
        }

        let supportChannelID;
        try {
            const meta = readFileSync(join(path, "meta.yml"), "utf8");
            console.log(meta);
            const parsed = yaml.load(meta);
            if (parsed.thread && typeof parsed.thread === "string" && /^\d+$/.test(parsed.thread)) {
                supportChannelID = parsed.thread;
            }
        } catch {
            supportChannelID = null;
        }

        const rawMeta = file.match(PLUGIN_META_REGEX);
        resolve({
            name: rawMeta![1],
            description: rawMeta![2],
            usesPreSend: file.includes("PreSendListener") || file.includes("onBeforeMessage"),
            usesNative: files.includes("native.ts") || files.includes("native.js"),
            remote: remoteURL ? remoteURL[1] : "",
            supportChannelID,
            ...extra
        });

    });
}

async function cloneRepo(link: string, repo: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn("git", ["clone", link], {
            cwd: join(vencordPath, "..", "src", "userplugins")
        });
        proc.once("close", async () => {
            if (proc.exitCode !== 0) {
                if (!existsSync(join(vencordPath, "..", "src", "userplugins", repo)))
                    return reject("Failed to clone");
                const deleteReqDialog = await dialog.showMessageBox({
                    title: "Error",
                    message: "Plugin already exists",
                    type: "error",
                    detail: `The plugin that you tried to clone already exists at ${join(vencordPath, "..", "src", "userplugins")}.\nWould you like to reclone it? Only do this if you want to reinstall or update the plugin.`,
                    buttons: ["No", "Yes"]
                });
                if (deleteReqDialog.response !== 1) return reject("User rejected");
                await rm(join(vencordPath, "..", "src", "userplugins", repo), {
                    recursive: true
                });
                await cloneRepo(link, repo);
            }
            resolve();
        });
    });
}

function generateReviewPluginContent(meta: {
    name: string;
    description: string;
    usesPreSend: boolean;
    usesNative: boolean;
}): string {
    const template = pluginValidateContent.replace("%PLUGINNAME%", meta.name.replaceAll("<", "&lt;")).replace("%PLUGINDESC%", meta.description.replaceAll("<", "&lt;")).replace("%WARNINGHIDER%", !meta.usesNative && !meta.usesPreSend ? "[data-useless=\"warning\"] { display: none !important; }" : "").replace("%NATIVETSHIDER%", meta.usesNative ? "" : "#native-ts-warning { display: none !important; }").replace("%PRESENDHIDER%", meta.usesPreSend ? "" : "#pre-send-warning { display: none !important; }");
    const buf = Buffer.from(template).toString("base64");
    return `data:text/html;base64,${buf}`;
}

function generateUpdatePluginContent(meta: {
    name: string;
    description: string;
    remote: string;
    commit: string;
}): string {
    const template = updateValidateContent.replace("%PLUGINNAME%", meta.name.replaceAll("<", "&lt;")).replace("%PLUGINDESC%", meta.description.replaceAll("<", "&lt;")).replace("%REMOTE%", meta.remote).replace("%COMMITMESSAGE%", meta.commit.replaceAll("\n", "<br />"));
    const buf = Buffer.from(template).toString("base64");
    return `data:text/html;base64,${buf}`;
}

export async function getUserplugins() {
    const folderContents = await readdir(join(vencordPath, "..", "src", "userplugins"), {
        withFileTypes: true
    });
    const plugins = await Promise.allSettled(
        folderContents
            .filter(item => item.isDirectory())
            .map(item => ({
                path: join(item.parentPath, item.name),
                directory: item.name
            }))
            .map(({ path, directory }) => getPluginMeta(path, { directory }))
    );

    return plugins
        .filter(p => p.status === "fulfilled")
        .map(p => p.value);
}

export async function updatePlugin(_, directory: string) {
    return new Promise((resolve, reject) => {
        const pluginDir = join(vencordPath, "../src/userplugins", directory);

        async function doStuff() {
            const pluginMeta = await getPluginMeta(pluginDir);

            const win = new BrowserWindow({
                maximizable: false,
                minimizable: false,
                width: 560,
                height: 600,
                resizable: false,
                webPreferences: {
                    devTools: true
                },
                title: "Review userplugin",
                modal: true,
                parent: BrowserWindow.getAllWindows()[0],
                show: false,
                autoHideMenuBar: true
            });
            const reView /* haha got it */ = new WebContentsView({
                webPreferences: {
                    devTools: true,
                    nodeIntegration: true
                }
            });
            win.contentView.addChildView(reView);

            const commitProc = exec("git log origin/HEAD...HEAD --oneline --pretty=format:%an////////%h////////%H////////%s", {
                cwd: pluginDir
            });
            let rawOutput = "";
            commitProc.stdout?.on("data", d => {
                rawOutput += String(d);
            });
            commitProc.once("close", () => {
                win.loadURL(generateUpdatePluginContent({
                    name: pluginMeta.name,
                    description: pluginMeta.description,
                    remote: pluginMeta.remote,
                    commit: rawOutput.split("\n").map(line => line.split("////////")).map(([user, shortCommit, longCommit, message]) => `${user} (<a href="${pluginMeta.remote.replace("plugins.nin0.dev", "git.nin0.dev/userplugins")}/commit/${longCommit}" style="font-family: monospace;">${shortCommit}</a>) ~ ${message}`).join("\n")
                }));
                win.on("page-title-updated", async e => {
                    if (win.webContents.getTitle().startsWith("openLink:")) {
                        await shell.openExternal(win.webContents.getTitle().replace("openLink:", ""));
                    }
                    switch (win.webContents.getTitle() as "abortInstall" | "install") {
                        case "abortInstall": {
                            win.close();
                            return reject("Rejected by user");
                        }
                        case "install": {
                            win.close();
                            try {
                                const otherProc = exec("git rebase origin/HEAD", {
                                    cwd: pluginDir
                                });
                                let errored = "";
                                otherProc.stderr?.on("data", d => { if (String(d).includes("Success")) return; errored += String(d); });
                                otherProc.once("close", () => {
                                    if (errored) if (!errored.includes("Success")) return reject(`Failed to apply the update, chances are you have local changes that conflict with your remote. Git errors:\n\n${errored}`);
                                    build().then(() => resolve(JSON.stringify({
                                        name: pluginMeta.name,
                                        native: pluginMeta.usesNative
                                    })));
                                });
                            }
                            catch (e) {
                                reject((e as Error).toString());
                            }
                            break;
                        }
                    }
                });
            });
            win.show();
        }
        doStuff();
    });
}

export async function openGitPathModal(_: any) {
    const gitPathSet: string | undefined = NativeSettings.store.plugins.UserpluginInstaller?.gitPath;
    const win = new BrowserWindow({
        maximizable: false,
        minimizable: false,
        width: 560,
        height: 400,
        resizable: false,
        webPreferences: {
            devTools: true
        },
        title: "Set Git path",
        modal: true,
        parent: BrowserWindow.getAllWindows()[0],
        show: false,
        autoHideMenuBar: true
    });
    const reView = new WebContentsView({
        webPreferences: {
            devTools: true,
            nodeIntegration: true
        }
    });
    win.contentView.addChildView(reView);
    win.loadURL(`data:text/html;base64,${Buffer.from(setGitPathContent).toString("base64")}`);
    win.on("page-title-updated", async _ => {
        const t = win.webContents.getTitle();
        if (t === "abort") win.close();
        if (t.startsWith("ok")) {
            if (!NativeSettings.store.plugins.UserpluginInstaller) {
                NativeSettings.store.plugins.UserpluginInstaller = {
                    gitPath: undefined
                };
            }
            if (t === "ok-") {
                NativeSettings.store.plugins.UserpluginInstaller.gitPath = undefined;
            } else {
                const gitPath2 = t.split("-").toSpliced(0, 1).join("-");
                NativeSettings.store.plugins.UserpluginInstaller.gitPath = gitPath2;
            }
            win.close();
        }
        if (t.startsWith("check")) {
            try {
                const gitProc = spawn(t === "check-" ? "git" : t.split("-").toSpliced(0, 1).join("-"), ["--version"]);
                let rawOutput = "";
                gitProc.stdout?.on("data", d => {
                    rawOutput += String(d);
                });
                gitProc.on("error", e => {
                    dialog.showMessageBox({
                        title: "Error",
                        message: "Git error",
                        type: "error",
                        detail: `${e}\n\nDouble-check the path you entered.`,
                        buttons: ["OK"]
                    });
                });
                gitProc.once("close", () => {
                    if (gitProc.exitCode === 0) {
                        dialog.showMessageBox({
                            title: "Success",
                            message: "Git works!",
                            type: "info",
                            detail: `Successfully called ${rawOutput.trim()}`,
                            buttons: ["OK"]
                        });
                    }
                });
            } catch (e) {
                dialog.showMessageBox({
                    title: "Error",
                    message: "Git error",
                    type: "error",
                    detail: `${e}\n\nDouble-check the path you entered.`,
                    buttons: ["OK"]
                });
            }
        }
    });
    win.show();
    if (gitPathSet) {
        win.webContents.executeJavaScript(`document.querySelector("input").value = ${JSON.stringify(gitPathSet)};`);
    }

    console.log(yaml.load(`
    name: test
    items:
      - a
      - b
    `));
}
