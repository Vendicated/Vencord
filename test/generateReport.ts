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
// puppeteer is not added as dependency because it downloads chromium (~100mb)
// which is not needed for normal development and manually installed by github actions
// Thus, if you want to run this locally, run `pnpm i puppeteer` first
import pup, { JSHandle } from "puppeteer";

const browser = await pup.launch({
    headless: true,
    args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        '--user-agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36"',
    ]
});

const page = await browser.newPage();

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
    otherErrors: [] as string[]
};

function toCodeBlock(s: string) {
    s = s.replace(/```/g, "`\u200B`\u200B`");
    return "```" + s + " ```";
}

function printReport() {
    console.log("# Vencord Report");
    console.log();

    console.log("## Bad Patches");
    report.badPatches.forEach(p => {
        console.log(`- ${p.plugin} (${p.type})`);
        console.log(`  - ID: \`${p.id}\``);
        console.log(`  - Match: ${toCodeBlock(p.match)}`);
        if (p.error) console.log(`  - Error: ${toCodeBlock(p.error)}`);
    });

    console.log();

    console.log("## Bad Starts");
    report.badStarts.forEach(p => {
        console.log(`- ${p.plugin}`);
        console.log(`  - Error: ${toCodeBlock(p.error)}`);
    });
}

page.on("console", async e => {
    const level = e.type();
    const args = e.args();

    const firstArg = (await args[0]?.jsonValue());
    if (firstArg === "PUPPETEER_TEST_DONE_SIGNAL") {
        await browser.close();
        printReport();
        process.exit();
    }

    const isVencord = (await args[0]?.jsonValue()) === "[Vencord]";
    if (isVencord) {
        // make ci fail
        process.exitCode = 1;

        const jsonArgs = await Promise.all(args.map(a => a.jsonValue()));
        const [, tag, message] = jsonArgs;
        const cause = await maybeGetError(args[3]);

        switch (tag) {
            case "WebpackInterceptor:":
                const [, plugin, type, id, regex] = (message as string).match(/Patch by (.+?) (had no effect|errored|found no module) \(Module id is (.+?)\): (.+)/)!;
                report.badPatches.push({
                    plugin,
                    type,
                    id,
                    match: regex,
                    error: cause
                });
                break;
            case "PluginManager:":
                const [, name] = (message as string).match(/Failed to start (.+)/)!;
                report.badStarts.push({
                    plugin: name,
                    error: cause
                });
                break;
        }
    } else if (level === "error") {
        report.otherErrors.push(e.text());
    }
});

page.on("error", e => console.error("[Error]", e));
page.on("pageerror", e => console.error("[Page Error]", e));

await page.setBypassCSP(true);

function runTime(token: string) {
    // spoof languages to not be suspicious
    Object.defineProperty(navigator, "languages", {
        get: function () {
            return ["en-US", "en"];
        },
    });


    // Monkey patch Logger to not log with custom css
    Vencord.Util.Logger.prototype._log = function (level, levelColor, args) {
        if (level === "warn" || level === "error")
            console[level]("[Vencord]", this.name + ":", ...args);
    };

    // force enable all plugins and patches
    Vencord.Plugins.patches.length = 0;
    Object.values(Vencord.Plugins.plugins).forEach(p => {
        p.required = true;
        p.patches?.forEach(patch => {
            patch.plugin = p.name;
            delete patch.predicate;
            if (!Array.isArray(patch.replacement))
                patch.replacement = [patch.replacement];
            Vencord.Plugins.patches.push(patch);
        });
    });

    Vencord.Webpack.waitFor(
        "loginToken",
        m => m.loginToken(token)
    );

    // force load all chunks
    Vencord.Webpack.onceReady.then(() => setTimeout(async () => {
        const { wreq } = Vencord.Webpack;

        const ids = Function("return" + wreq.u.toString().match(/\{.+\}/s)![0])();
        for (const id in ids) {
            const isWasm = await fetch(wreq.p + wreq.u(id))
                .then(r => r.text())
                .then(t => t.includes(".module.wasm"));

            if (!isWasm)
                await wreq.e(id as any);
        }
        for (const patch of Vencord.Plugins.patches) {
            new Vencord.Util.Logger("WebpackInterceptor").warn(`Patch by ${patch.plugin} found no module (Module id is -): ${patch.find}`);
        }
        setTimeout(() => console.log("PUPPETEER_TEST_DONE_SIGNAL"), 1000);
    }, 1000));
}

await page.evaluateOnNewDocument(`
    ${readFileSync("./dist/browser.js", "utf-8")}

    ;(${runTime.toString()})(${JSON.stringify(process.env.DISCORD_TOKEN)});
`);

await page.goto("https://discord.com/login");
