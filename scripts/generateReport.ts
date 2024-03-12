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

// eslint-disable-next-line spaced-comment
/// <reference types="../src/globals" />
// eslint-disable-next-line spaced-comment
/// <reference types="../src/modules" />

import { readFileSync } from "fs";
import pup, { JSHandle } from "puppeteer-core";

for (const variable of ["DISCORD_TOKEN", "CHROMIUM_BIN"]) {
    if (!process.env[variable]) {
        console.error(`Missing environment variable ${variable}`);
        process.exit(1);
    }
}

const CANARY = process.env.USE_CANARY === "true";

const browser = await pup.launch({
    headless: "new",
    executablePath: process.env.CHROMIUM_BIN
});

const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36");

function maybeGetError(handle: JSHandle) {
    return (handle as JSHandle<Error>)?.getProperty("message")
        .then(m => m.jsonValue());
}

const report = {
    badPatches: [] as {
        plugin: string;
        type: string;
        id: string;
        match: string;
        error?: string;
    }[],
    badStarts: [] as {
        plugin: string;
        error: string;
    }[],
    otherErrors: [] as string[],
    badWebpackFinds: [] as string[]
};

const IGNORED_DISCORD_ERRORS = [
    "KeybindStore: Looking for callback action",
    "Unable to process domain list delta: Client revision number is null",
    "Downloading the full bad domains file",
    /\[GatewaySocket\].{0,110}Cannot access '/,
    "search for 'name' in undefined"
] as Array<string | RegExp>;

function toCodeBlock(s: string) {
    s = s.replace(/```/g, "`\u200B`\u200B`");
    return "```" + s + " ```";
}

async function printReport() {
    console.log();

    console.log("# Vencord Report" + (CANARY ? " (Canary)" : ""));

    console.log();

    console.log("## Bad Patches");
    report.badPatches.forEach(p => {
        console.log(`- ${p.plugin} (${p.type})`);
        console.log(`  - ID: \`${p.id}\``);
        console.log(`  - Match: ${toCodeBlock(p.match)}`);
        if (p.error) console.log(`  - Error: ${toCodeBlock(p.error)}`);
    });

    console.log();

    console.log("## Bad Webpack Finds");
    report.badWebpackFinds.forEach(p => console.log("- " + p));

    console.log();

    console.log("## Bad Starts");
    report.badStarts.forEach(p => {
        console.log(`- ${p.plugin}`);
        console.log(`  - Error: ${toCodeBlock(p.error)}`);
    });

    console.log();

    const ignoredErrors = [] as string[];
    report.otherErrors = report.otherErrors.filter(e => {
        if (IGNORED_DISCORD_ERRORS.some(regex => e.match(regex))) {
            ignoredErrors.push(e);
            return false;
        }
        return true;
    });

    console.log("## Discord Errors");
    report.otherErrors.forEach(e => {
        console.log(`- ${toCodeBlock(e)}`);
    });

    console.log();

    console.log("## Ignored Discord Errors");
    ignoredErrors.forEach(e => {
        console.log(`- ${toCodeBlock(e)}`);
    });

    console.log();

    if (process.env.DISCORD_WEBHOOK) {
        await fetch(process.env.DISCORD_WEBHOOK, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                description: "Here's the latest Vencord Report!",
                username: "Vencord Reporter" + (CANARY ? " (Canary)" : ""),
                avatar_url: "https://cdn.discordapp.com/avatars/1017176847865352332/c312b6b44179ae6817de7e4b09e9c6af.webp?size=512",
                embeds: [
                    {
                        title: "Bad Patches",
                        description: report.badPatches.map(p => {
                            const lines = [
                                `**__${p.plugin} (${p.type}):__**`,
                                `ID: \`${p.id}\``,
                                `Match: ${toCodeBlock(p.match)}`
                            ];
                            if (p.error) lines.push(`Error: ${toCodeBlock(p.error)}`);
                            return lines.join("\n");
                        }).join("\n\n") || "None",
                        color: report.badPatches.length ? 0xff0000 : 0x00ff00
                    },
                    {
                        title: "Bad Webpack Finds",
                        description: report.badWebpackFinds.map(toCodeBlock).join("\n") || "None",
                        color: report.badWebpackFinds.length ? 0xff0000 : 0x00ff00
                    },
                    {
                        title: "Bad Starts",
                        description: report.badStarts.map(p => {
                            const lines = [
                                `**__${p.plugin}:__**`,
                                toCodeBlock(p.error)
                            ];
                            return lines.join("\n");
                        }
                        ).join("\n\n") || "None",
                        color: report.badStarts.length ? 0xff0000 : 0x00ff00
                    },
                    {
                        title: "Discord Errors",
                        description: report.otherErrors.length ? toCodeBlock(report.otherErrors.join("\n")) : "None",
                        color: report.otherErrors.length ? 0xff0000 : 0x00ff00
                    }
                ]
            })
        }).then(res => {
            if (!res.ok) console.error(`Webhook failed with status ${res.status}`);
            else console.error("Posted to Discord Webhook successfully");
        });
    }
}

page.on("console", async e => {
    const level = e.type();
    const rawArgs = e.args();

    const firstArg = await rawArgs[0]?.jsonValue();
    if (firstArg === "[PUPPETEER_TEST_DONE_SIGNAL]") {
        await browser.close();
        await printReport();
        process.exit();
    }

    const isVencord = firstArg === "[Vencord]";
    const isDebug = firstArg === "[PUP_DEBUG]";
    const isWebpackFindFail = firstArg === "[PUP_WEBPACK_FIND_FAIL]";

    if (isWebpackFindFail) {
        process.exitCode = 1;
        report.badWebpackFinds.push(await rawArgs[1].jsonValue() as string);
    }

    if (isVencord) {
        const args = await Promise.all(e.args().map(a => a.jsonValue()));

        const [, tag, message] = args as Array<string>;
        const cause = await maybeGetError(e.args()[3]);

        switch (tag) {
            case "WebpackInterceptor:":
                const patchFailMatch = message.match(/Patch by (.+?) (had no effect|errored|found no module) \(Module id is (.+?)\): (.+)/)!;
                if (!patchFailMatch) break;

                process.exitCode = 1;

                const [, plugin, type, id, regex] = patchFailMatch;
                report.badPatches.push({
                    plugin,
                    type,
                    id,
                    match: regex.replace(/\[A-Za-z_\$\]\[\\w\$\]\*/g, "\\i"),
                    error: cause
                });

                break;
            case "PluginManager:":
                const failedToStartMatch = message.match(/Failed to start (.+)/);
                if (!failedToStartMatch) break;

                process.exitCode = 1;

                const [, name] = failedToStartMatch;
                report.badStarts.push({
                    plugin: name,
                    error: cause
                });

                break;
        }
    }

    if (isDebug) {
        console.error(e.text());
    } else if (level === "error") {
        const text = await Promise.all(
            e.args().map(async a => {
                try {
                    return await maybeGetError(a) || await a.jsonValue();
                } catch (e) {
                    return a.toString();
                }
            })
        ).then(a => a.join(" ").trim());


        if (text.length && !text.startsWith("Failed to load resource: the server responded with a status of") && !text.includes("Webpack")) {
            console.error("[Unexpected Error]", text);
            report.otherErrors.push(text);
        }
    }
});

page.on("error", e => console.error("[Error]", e));
page.on("pageerror", e => console.error("[Page Error]", e));

await page.setBypassCSP(true);

function runTime(token: string) {
    console.log("[PUP_DEBUG]", "Starting test...");

    try {
        // Spoof languages to not be suspicious
        Object.defineProperty(navigator, "languages", {
            get: function () {
                return ["en-US", "en"];
            },
        });

        // Monkey patch Logger to not log with custom css
        // @ts-ignore
        Vencord.Util.Logger.prototype._log = function (level, levelColor, args) {
            if (level === "warn" || level === "error")
                console[level]("[Vencord]", this.name + ":", ...args);
        };

        // Force enable all plugins and patches
        Vencord.Plugins.patches.length = 0;
        Object.values(Vencord.Plugins.plugins).forEach(p => {
            // Needs native server to run
            if (p.name === "WebRichPresence (arRPC)") return;

            Vencord.Settings.plugins[p.name].enabled = true;
            p.patches?.forEach(patch => {
                patch.plugin = p.name;
                delete patch.predicate;
                delete patch.group;

                if (!Array.isArray(patch.replacement))
                    patch.replacement = [patch.replacement];

                patch.replacement.forEach(r => {
                    delete r.predicate;
                });

                Vencord.Plugins.patches.push(patch);
            });
        });

        Vencord.Webpack.waitFor(
            "loginToken",
            m => {
                console.log("[PUP_DEBUG]", "Logging in with token...");
                m.loginToken(token);
            }
        );

        // Force load all chunks
        Vencord.Webpack.onceReady.then(() => setTimeout(async () => {
            console.log("[PUP_DEBUG]", "Webpack is ready!");

            const { wreq } = Vencord.Webpack;

            console.log("[PUP_DEBUG]", "Loading all chunks...");

            let chunks = null as Record<number, string[]> | null;
            const sym = Symbol("Vencord.chunksExtract");

            Object.defineProperty(Object.prototype, sym, {
                get() {
                    chunks = this;
                },
                set() { },
                configurable: true,
            });

            await (wreq as any).el(sym);
            delete Object.prototype[sym];

            const validChunksEntryPoints = new Set<string>();
            const validChunks = new Set<string>();
            const invalidChunks = new Set<string>();

            if (!chunks) throw new Error("Failed to get chunks");

            for (const entryPoint in chunks) {
                const chunkIds = chunks[entryPoint];
                let invalidEntryPoint = false;

                for (const id of chunkIds) {
                    if (wreq.u(id) == null || wreq.u(id) === "undefined.js") continue;

                    const isWasm = await fetch(wreq.p + wreq.u(id))
                        .then(r => r.text())
                        .then(t => t.includes(".module.wasm") || !t.includes("(this.webpackChunkdiscord_app=this.webpackChunkdiscord_app||[]).push"));

                    if (isWasm) {
                        invalidChunks.add(id);
                        invalidEntryPoint = true;
                        continue;
                    }

                    validChunks.add(id);
                }

                if (!invalidEntryPoint)
                    validChunksEntryPoints.add(entryPoint);
            }

            for (const entryPoint of validChunksEntryPoints) {
                try {
                    // Loads all chunks required for an entry point
                    await (wreq as any).el(entryPoint);
                } catch (err) { }
            }

            // Matches "id" or id:
            const chunkIdRegex = /(?:"(\d+?)")|(?:(\d+?):)/g;
            const wreqU = wreq.u.toString();

            const allChunks = [] as string[];
            let currentMatch: RegExpExecArray | null;

            while ((currentMatch = chunkIdRegex.exec(wreqU)) != null) {
                const id = currentMatch[1] ?? currentMatch[2];
                if (id == null) continue;

                allChunks.push(id);
            }

            if (allChunks.length === 0) throw new Error("Failed to get all chunks");
            const chunksLeft = allChunks.filter(id => {
                return !(validChunks.has(id) || invalidChunks.has(id));
            });

            for (const id of chunksLeft) {
                const isWasm = await fetch(wreq.p + wreq.u(id))
                    .then(r => r.text())
                    .then(t => t.includes(".module.wasm") || !t.includes("(this.webpackChunkdiscord_app=this.webpackChunkdiscord_app||[]).push"));

                // Loads a chunk
                if (!isWasm) await wreq.e(id as any);
            }

            // Make sure every chunk has finished loading
            await new Promise(r => setTimeout(r, 1000));

            for (const entryPoint of validChunksEntryPoints) {
                try {
                    if (wreq.m[entryPoint]) wreq(entryPoint as any);
                } catch (err) {
                    console.error(err);
                }
            }

            console.log("[PUP_DEBUG]", "Finished loading all chunks!");

            for (const patch of Vencord.Plugins.patches) {
                if (!patch.all) {
                    new Vencord.Util.Logger("WebpackInterceptor").warn(`Patch by ${patch.plugin} found no module (Module id is -): ${patch.find}`);
                }
            }

            for (const [searchType, args] of Vencord.Webpack.lazyWebpackSearchHistory) {
                let method = searchType;

                if (searchType === "findComponent") method = "find";
                if (searchType === "findExportedComponent") method = "findByProps";
                if (searchType === "waitFor" || searchType === "waitForComponent") {
                    if (typeof args[0] === "string") method = "findByProps";
                    else method = "find";
                }
                if (searchType === "waitForStore") method = "findStore";

                try {
                    let result: any;

                    if (method === "proxyLazyWebpack" || method === "LazyComponentWebpack") {
                        const [factory] = args;
                        result = factory();
                    } else if (method === "extractAndLoadChunks") {
                        const [code, matcher] = args;

                        const module = Vencord.Webpack.findModuleFactory(...code);
                        if (module) result = module.toString().match(Vencord.Util.canonicalizeMatch(matcher));
                    } else {
                        // @ts-ignore
                        result = Vencord.Webpack[method](...args);
                    }

                    if (result == null || ("$$vencordInternal" in result && result.$$vencordInternal() == null)) throw "a rock at ben shapiro";
                } catch (e) {
                    let logMessage = searchType;
                    if (method === "find" || method === "proxyLazyWebpack" || method === "LazyComponentWebpack") logMessage += `(${args[0].toString().slice(0, 147)}...)`;
                    else if (method === "extractAndLoadChunks") logMessage += `([${args[0].map(arg => `"${arg}"`).join(", ")}], ${args[1].toString()})`;
                    else logMessage += `(${args.map(arg => `"${arg}"`).join(", ")})`;

                    console.log("[PUP_WEBPACK_FIND_FAIL]", logMessage);
                }
            }

            setTimeout(() => console.log("[PUPPETEER_TEST_DONE_SIGNAL]"), 1000);
        }, 1000));
    } catch (e) {
        console.log("[PUP_DEBUG]", "A fatal error occurred:", e);
        process.exit(1);
    }
}

await page.evaluateOnNewDocument(`
    ${readFileSync("./dist/browser.js", "utf-8")}

    ;(${runTime.toString()})(${JSON.stringify(process.env.DISCORD_TOKEN)});
`);

await page.goto(CANARY ? "https://canary.discord.com/login" : "https://discord.com/login");
