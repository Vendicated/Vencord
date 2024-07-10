/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";

import puppeteer from "puppeteer-core";

import { assertEnvValidity } from "../utils.mjs";
import { autoFindClass, autoFindEnum, autoFindStore, getClassChanges, getEnumChanges, isValidClass, isValidEnum } from "./finds.mjs";
import { getChangeReport } from "./getChangeReport.mjs";
import { getSummary } from "./getSummary.mjs";
import { postError, postReport } from "./webhooks.mjs";

process.on("uncaughtExceptionMonitor", error => {
    const { DISCORD_WEBHOOK, CHANNEL } = process.env;
    postError(error, DISCORD_WEBHOOK, CHANNEL);
});

assertEnvValidity(process.env, {
    CHANNEL: ["stable", "ptb", "canary"],
    CHROMIUM_BIN: true,
    DISCORD_TOKEN: true,
    DISCORD_WEBHOOK: false,
    VENCORD_DIST: true,
});

const { CHANNEL, CHROMIUM_BIN, DISCORD_TOKEN, DISCORD_WEBHOOK, GITHUB_STEP_SUMMARY, VENCORD_DIST } = process.env;
const CWD = process.cwd();

const browser = await puppeteer.launch({
    executablePath: CHROMIUM_BIN,
    headless: true,
    args: ["--no-sandbox"]
});

const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
await page.setBypassCSP(true);

await page.evaluateOnNewDocument(`(() => {
    "use strict";
    if (/(?:^|\\.)discord\\.com$/.test(location.hostname)) {
        ${readFileSync(join(CWD, VENCORD_DIST), "utf-8")};
        window.Vencord = Vencord;
        window.CHANGE_REPORTER_LOGGED_IN = new Promise(res => {
            Vencord.Webpack.waitFor("loginToken", async exps => {
                await exps.loginToken(${JSON.stringify(DISCORD_TOKEN)});
                res();
            });
        });
    }
})();
`);

await page.goto(`https://${CHANNEL === "stable" ? "" : CHANNEL + "."}discord.com/login`);
await page.evaluate(`(async () => {
    "use strict";
    await CHANGE_REPORTER_LOGGED_IN;
    window.autoFindStore = (${autoFindStore}).bind(Vencord);
    window.autoFindClass = (${autoFindClass}).bind(Vencord);
    window.isValidClass = ${isValidClass};
    window.getClassChanges = ${getClassChanges};
    window.autoFindEnum = (${autoFindEnum}).bind(Vencord);
    window.isValidEnum = ${isValidEnum};
    window.getEnumChanges = ${getEnumChanges};
})();
`);

const report = await getChangeReport(page);
browser.close();

const summary = getSummary(report, CHANNEL);
if (GITHUB_STEP_SUMMARY)
    writeFile(GITHUB_STEP_SUMMARY, summary, "utf-8");
else
    console.log(summary);

if (DISCORD_WEBHOOK)
    postReport(report, DISCORD_WEBHOOK, CHANNEL);
