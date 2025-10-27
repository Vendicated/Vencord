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

/// <reference types="../src/globals" />
/// <reference types="../src/modules" />

import { createHmac } from "crypto";
import { readFileSync } from "fs";
import pup, { JSHandle } from "puppeteer-core";

const logStderr = (...data: any[]) => console.error(`${CANARY ? "CANARY" : "STABLE"} ---`, ...data);

for (const variable of ["CHROMIUM_BIN"]) {
    if (!process.env[variable]) {
        logStderr(`Missing environment variable ${variable}`);
        process.exit(1);
    }
}

const CANARY = process.env.USE_CANARY === "true";
let metaData = {
    buildNumber: "Unknown Build Number",
    buildHash: "Unknown Build Hash"
};

const browser = await pup.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_BIN,
    args: ["--no-sandbox"]
});

const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36");
await page.setBypassCSP(true);

async function maybeGetError(handle: JSHandle): Promise<string | undefined> {
    return await (handle as JSHandle<Error>)?.getProperty("message")
        .then(m => m?.jsonValue())
        .catch(() => undefined);
}

interface PatchInfo {
    plugin: string;
    type: string;
    id: string;
    match: string;
    error?: string;
};

const report = {
    badPatches: [] as PatchInfo[],
    slowPatches: [] as PatchInfo[],
    badStarts: [] as {
        plugin: string;
        error: string;
    }[],
    otherErrors: [] as string[],
    ignoredErrors: [] as string[],
    badWebpackFinds: [] as string[]
};

const IGNORED_DISCORD_ERRORS = [
    "KeybindStore: Looking for callback action",
    "Unable to process domain list delta: Client revision number is null",
    "Downloading the full bad domains file",
    /\[GatewaySocket\].{0,110}Cannot access '/,
    "search for 'name' in undefined",
    "Attempting to set fast connect zstd when unsupported"
] as Array<string | RegExp>;

function toCodeBlock(s: string, indentation = 0, isDiscord = false) {
    s = s.replace(/```/g, "`\u200B`\u200B`");

    const indentationStr = Array(!isDiscord ? indentation : 0).fill(" ").join("");
    return `\`\`\`\n${s.split("\n").map(s => indentationStr + s).join("\n")}\n${indentationStr}\`\`\``;
}

async function printReport() {
    console.log();

    console.log("# Vencord Report" + (CANARY ? " (Canary)" : ""));

    console.log();

    console.log("## Bad Patches");
    report.badPatches.forEach(p => {
        console.log(`- ${p.plugin} (${p.type})`);
        console.log(`  - ID: \`${p.id}\``);
        console.log(`  - Match: ${toCodeBlock(p.match, "  - Match: ".length)}`);
        if (p.error) console.log(`  - Error: ${toCodeBlock(p.error, "  - Error: ".length)}`);
    });

    console.log();

    console.log("## Bad Webpack Finds");
    report.badWebpackFinds.forEach(p => console.log("- " + toCodeBlock(p, "- ".length)));

    console.log();

    console.log("## Bad Starts");
    report.badStarts.forEach(p => {
        console.log(`- ${p.plugin}`);
        console.log(`  - Error: ${toCodeBlock(p.error, "  - Error: ".length)}`);
    });

    console.log();

    console.log("## Discord Errors");
    report.otherErrors.forEach(e => {
        console.log(`- ${toCodeBlock(e, "- ".length)}`);
    });

    console.log();

    console.log("## Ignored Discord Errors");
    report.ignoredErrors.forEach(e => {
        console.log(`- ${toCodeBlock(e, "- ".length)}`);
    });

    console.log();

    if (process.env.WEBHOOK_URL) {
        const patchesToEmbed = (title: string, patches: PatchInfo[], color: number) => ({
            title,
            color,
            description: patches.map(p => {
                const lines = [
                    `**__${p.plugin} (${p.type}):__**`,
                    `ID: \`${p.id}\``,
                    `Match: ${toCodeBlock(p.match, "Match: ".length, true)}`
                ];
                if (p.error) lines.push(`Error: ${toCodeBlock(p.error, "Error: ".length, true)}`);

                return lines.join("\n");
            }).join("\n\n"),
        });

        const embeds = [
            {
                author: {
                    name: `Discord ${CANARY ? "Canary" : "Stable"} (${metaData.buildNumber})`,
                    url: `https://nelly.tools/builds/app/${metaData.buildHash}`,
                    icon_url: CANARY ? "https://cdn.discordapp.com/emojis/1252721945699549327.png?size=128" : "https://cdn.discordapp.com/emojis/1252721943463985272.png?size=128"
                },
                color: CANARY ? 0xfbb642 : 0x5865f2
            },
            report.badPatches.length > 0 && patchesToEmbed("Bad Patches", report.badPatches, 0xff0000),
            report.slowPatches.length > 0 && patchesToEmbed("Slow Patches", report.slowPatches, 0xf0b232),
            report.badWebpackFinds.length > 0 && {
                title: "Bad Webpack Finds",
                description: report.badWebpackFinds.map(f => toCodeBlock(f, 0, true)).join("\n") || "None",
                color: 0xff0000
            },
            report.badStarts.length > 0 && {
                title: "Bad Starts",
                description: report.badStarts.map(p => {
                    const lines = [
                        `**__${p.plugin}:__**`,
                        toCodeBlock(p.error, 0, true)
                    ];
                    return lines.join("\n");
                }
                ).join("\n\n") || "None",
                color: 0xff0000
            },
            report.otherErrors.length > 0 && {
                title: "Discord Errors",
                description: report.otherErrors.length ? toCodeBlock(report.otherErrors.join("\n"), 0, true) : "None",
                color: 0xff0000
            }
        ].filter(Boolean);

        if (embeds.length === 1) {
            embeds.push({
                title: "No issues found",
                description: "Seems like everything is working fine (for now) <:shipit:1330992641466433556>",
                color: 0x00ff00
            });
        }

        const body = JSON.stringify({
            username: "Vencord Reporter" + (CANARY ? " (Canary)" : ""),
            embeds
        });

        const headers = {
            "Content-Type": "application/json"
        };

        // functions similar to https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
        // used by venbot to ensure webhook invocations are genuine (since we will pass the webhook url as a workflow input which is publicly visible)
        // generate a secret with something like `openssl rand -hex 128`
        if (process.env.WEBHOOK_SECRET) {
            headers["X-Signature"] = "sha256=" + createHmac("sha256", process.env.WEBHOOK_SECRET).update(body).digest("hex");
        }

        await fetch(process.env.WEBHOOK_URL, {
            method: "POST",
            headers,
            body
        }).then(res => {
            if (!res.ok) logStderr(`Webhook failed with status ${res.status}`);
            else logStderr("Posted to Webhook successfully");
        });
    }
}

page.on("console", async e => {
    const level = e.type();
    const rawArgs = e.args();

    async function getText(skipFirst = true) {
        let args = e.args();
        if (skipFirst) args = args.slice(1);

        try {
            return await Promise.all(
                args.map(async a => {
                    return await maybeGetError(a) || await a.jsonValue();
                })
            ).then(a => a.join(" ").trim());
        } catch {
            return e.text();
        }
    }

    const firstArg = await rawArgs[0]?.jsonValue();

    const isVencord = firstArg === "[Vencord]";
    const isDebug = firstArg === "[PUP_DEBUG]";
    const isReporterMeta = firstArg === "[REPORTER_META]";

    if (isReporterMeta) {
        metaData = await rawArgs[1].jsonValue() as any;
        return;
    }

    outer:
    if (isVencord) {
        try {
            var args = await Promise.all(e.args().map(a => a.jsonValue()));
        } catch {
            break outer;
        }

        const [, tag, message, otherMessage] = args as Array<string>;

        switch (tag) {
            case "WebpackPatcher:":
                const patchFailMatch = message.match(/Patch by (.+?) (had no effect|errored|found no module) \(Module id is (.+?)\): (.+)/);
                const patchSlowMatch = message.match(/Patch by (.+?) (took [\d.]+?ms) \(Module id is (.+?)\): (.+)/);
                const match = patchFailMatch ?? patchSlowMatch;
                if (!match) break;

                logStderr(await getText());
                process.exitCode = 1;

                const [, plugin, type, id, regex] = match;
                const list = patchFailMatch ? report.badPatches : report.slowPatches;
                list.push({
                    plugin,
                    type,
                    id,
                    match: regex,
                    error: await maybeGetError(e.args()[3])
                });

                break;
            case "PluginManager:":
                const failedToStartMatch = message.match(/Failed to start (.+)/);
                if (!failedToStartMatch) break;

                logStderr(await getText());
                process.exitCode = 1;

                const [, name] = failedToStartMatch;
                report.badStarts.push({
                    plugin: name,
                    error: await maybeGetError(e.args()[3]) ?? "Unknown error"
                });

                break;
            case "LazyChunkLoader:":
                logStderr(await getText());

                switch (message) {
                    case "A fatal error occurred:":
                        process.exit(1);
                }

                break;
            case "Reporter:":
                logStderr(await getText());

                switch (message) {
                    case "A fatal error occurred:":
                        process.exit(1);
                    case "Webpack Find Fail:":
                        process.exitCode = 1;
                        report.badWebpackFinds.push(otherMessage);
                        break;
                    case "Finished test":
                        await browser.close();
                        await printReport();
                        process.exit();
                }
        }
    }

    if (isDebug) {
        logStderr(await getText());
    } else if (level === "error") {
        const text = await getText(false);

        if (text.length && !text.startsWith("Failed to load resource: the server responded with a status of") && !text.includes("Webpack")) {
            if (IGNORED_DISCORD_ERRORS.some(regex => text.match(regex))) {
                report.ignoredErrors.push(text);
            } else {
                logStderr("[Unexpected Error]", text);
                report.otherErrors.push(text);
            }
        }
    }
});

page.on("error", e => logStderr("[Error]", e.message));
page.on("pageerror", e => {
    if (e.message.includes("Sentry successfully disabled")) return;

    if (!e.message.startsWith("Object") && !e.message.includes("Cannot find module") && !/^.{1,2}$/.test(e.message)) {
        logStderr("[Page Error]", e.message);
        report.otherErrors.push(e.message);
    } else {
        report.ignoredErrors.push(e.message);
    }
});

await page.evaluateOnNewDocument(`
    if (location.host.endsWith("discord.com")) {
        ${readFileSync("./dist/browser.js", "utf-8")};
    }
`);

await page.goto(CANARY ? "https://canary.discord.com/login" : "https://discord.com/login");
