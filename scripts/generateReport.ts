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

/* eslint-disable no-fallthrough */

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
    headless: true,
    executablePath: process.env.CHROMIUM_BIN
});

const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36");
await page.setBypassCSP(true);

async function maybeGetError(handle: JSHandle): Promise<string | undefined> {
    return await (handle as JSHandle<Error>)?.getProperty("message")
        .then(m => m?.jsonValue())
        .catch(() => undefined);
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

    if (process.env.DISCORD_WEBHOOK) {
        await fetch(process.env.DISCORD_WEBHOOK, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                description: "Here's the latest Vencord Report!",
                username: "Vencord Reporter" + (CANARY ? " (Canary)" : ""),
                embeds: [
                    {
                        title: "Bad Patches",
                        description: report.badPatches.map(p => {
                            const lines = [
                                `**__${p.plugin} (${p.type}):__**`,
                                `ID: \`${p.id}\``,
                                `Match: ${toCodeBlock(p.match, "Match: ".length, true)}`
                            ];
                            if (p.error) lines.push(`Error: ${toCodeBlock(p.error, "Error: ".length, true)}`);
                            return lines.join("\n");
                        }).join("\n\n") || "None",
                        color: report.badPatches.length ? 0xff0000 : 0x00ff00
                    },
                    {
                        title: "Bad Webpack Finds",
                        description: report.badWebpackFinds.map(f => toCodeBlock(f, 0, true)).join("\n") || "None",
                        color: report.badWebpackFinds.length ? 0xff0000 : 0x00ff00
                    },
                    {
                        title: "Bad Starts",
                        description: report.badStarts.map(p => {
                            const lines = [
                                `**__${p.plugin}:__**`,
                                toCodeBlock(p.error, 0, true)
                            ];
                            return lines.join("\n");
                        }
                        ).join("\n\n") || "None",
                        color: report.badStarts.length ? 0xff0000 : 0x00ff00
                    },
                    {
                        title: "Discord Errors",
                        description: report.otherErrors.length ? toCodeBlock(report.otherErrors.join("\n"), 0, true) : "None",
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

    async function getText() {
        try {
            return await Promise.all(
                e.args().map(async a => {
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

    outer:
    if (isVencord) {
        try {
            var args = await Promise.all(e.args().map(a => a.jsonValue()));
        } catch {
            break outer;
        }

        const [, tag, message, otherMessage] = args as Array<string>;

        switch (tag) {
            case "WebpackInterceptor:":
                const patchFailMatch = message.match(/Patch by (.+?) (had no effect|errored|found no module) \(Module id is (.+?)\): (.+)/)!;
                if (!patchFailMatch) break;

                console.error(await getText());
                process.exitCode = 1;

                const [, plugin, type, id, regex] = patchFailMatch;
                report.badPatches.push({
                    plugin,
                    type,
                    id,
                    match: regex.replace(/\(\?:\[A-Za-z_\$\]\[\\w\$\]\*\)/g, "\\i"),
                    error: await maybeGetError(e.args()[3])
                });

                break;
            case "PluginManager:":
                const failedToStartMatch = message.match(/Failed to start (.+)/);
                if (!failedToStartMatch) break;

                console.error(await getText());
                process.exitCode = 1;

                const [, name] = failedToStartMatch;
                report.badStarts.push({
                    plugin: name,
                    error: await maybeGetError(e.args()[3]) ?? "Unknown error"
                });

                break;
            case "LazyChunkLoader:":
                console.error(await getText());

                switch (message) {
                    case "A fatal error occurred:":
                        process.exit(1);
                }

                break;
            case "Reporter:":
                console.error(await getText());

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
        console.error(await getText());
    } else if (level === "error") {
        const text = await getText();

        if (text.length && !text.startsWith("Failed to load resource: the server responded with a status of") && !text.includes("Webpack")) {
            if (IGNORED_DISCORD_ERRORS.some(regex => text.match(regex))) {
                report.ignoredErrors.push(text);
            } else {
                console.error("[Unexpected Error]", text);
                report.otherErrors.push(text);
            }
        }
    }
});

page.on("error", e => console.error("[Error]", e.message));
page.on("pageerror", e => {
    if (e.message.includes("Sentry successfully disabled")) return;

    if (!e.message.startsWith("Object") && !e.message.includes("Cannot find module")) {
        console.error("[Page Error]", e.message);
        report.otherErrors.push(e.message);
    } else {
        report.ignoredErrors.push(e.message);
    }
});

async function reporterRuntime(token: string) {
    Vencord.Webpack.waitFor(
        "loginToken",
        m => {
            console.log("[PUP_DEBUG]", "Logging in with token...");
            m.loginToken(token);
        }
    );
}

await page.evaluateOnNewDocument(`
    if (location.host.endsWith("discord.com")) {
        ${readFileSync("./dist/browser.js", "utf-8")};
        (${reporterRuntime.toString()})(${JSON.stringify(process.env.DISCORD_TOKEN)});
    }
`);

await page.goto(CANARY ? "https://canary.discord.com/login" : "https://discord.com/login");
