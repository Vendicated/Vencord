import { ipcMain } from 'electron';
import { promisify } from "util";
import IpcEvents from "../utils/IpcEvents";
import { execFile as cpExecFile } from 'child_process';
import { join } from 'path';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';

const VENCORD_SRC_DIR = join(__dirname, "..");

const execFile = promisify(cpExecFile);

function git(...args: string[]) {
    return execFile("git", args, {
        cwd: VENCORD_SRC_DIR
    });
}

async function calculateHashes() {
    const hashes = {} as Record<string, string>;

    await Promise.all(
        ["patcher.js", "preload.js", "renderer.js"].map(file => new Promise<void>(r => {
            const fis = createReadStream(join(__dirname, file));
            const hash = createHash("sha1", { encoding: "hex" });
            fis.once("end", () => {
                hash.end();
                hashes[file] = hash.read();
                r();
            });
            fis.pipe(hash);
        }))
    );

    return hashes;
}

function serializeErrors(func: (...args: any[]) => any) {
    return async function () {
        try {
            return {
                ok: true,
                value: await func(...arguments)
            };
        } catch (e: any) {
            return {
                ok: false,
                error: e instanceof Error ? {
                    // prototypes get lost, so turn error into plain object
                    ...e
                } : e
            };
        }
    };
}

async function getRepo() {
    const res = await git("remote", "get-url", "origin");
    return res.stdout.trim()
        .replace(/git@(.+):/, "https://$1/")
        .replace(/\.git$/, "");
}

async function calculateGitChanges() {
    await git("fetch");

    const res = await git("log", `HEAD...origin/main`, "--pretty=format:%an/%h/%s");

    const commits = res.stdout.trim();
    return commits ? commits.split("\n").map(line => {
        const [author, hash, ...rest] = line.split("/");
        return {
            hash, author, message: rest.join("/")
        };
    }) : [];
}

async function pull() {
    const res = await git("pull");
    return res.stdout.includes("Fast-forward");
}

async function build() {
    const res = await execFile("node", ["build.mjs"], {
        cwd: VENCORD_SRC_DIR
    });
    return !res.stderr.includes("Build failed");
}

ipcMain.handle(IpcEvents.GET_HASHES, serializeErrors(calculateHashes));
ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(getRepo));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(pull));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(build));
