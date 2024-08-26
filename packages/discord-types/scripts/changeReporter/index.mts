/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import puppeteer from "puppeteer-core";

import { assertEnvValidity } from "../utils.mjs";
import config from "./config.mjs";
import { autoFindClass, autoFindStore, getClassChanges, isValidClass } from "./finds/classes.mjs";
import { autoFindEnum, getEnumChanges, isValidEnum } from "./finds/enums.mjs";
import { logSummary } from "./logging/summaries.mjs";
import { postError, postReport } from "./logging/webhooks.mjs";
import { getChangeReport } from "./reports/getChangeReport.mjs";

process.on("uncaughtExceptionMonitor", error => {
    const { DISCORD_WEBHOOK, CHANNEL } = process.env;
    postError(error, DISCORD_WEBHOOK, CHANNEL);
});

assertEnvValidity(process.env, {
    CHANNEL: ["stable", "ptb", "canary"],
    CHROMIUM_BIN: true,
    CHROMIUM_VERSION: /^\d+(?:\.|$)/,
    DISCORD_TOKEN: true,
    DISCORD_WEBHOOK: false,
    VENCORD_DIST: true,
});

const { CHANNEL, CHROMIUM_BIN, CHROMIUM_VERSION, DISCORD_TOKEN, DISCORD_WEBHOOK, VENCORD_DIST } = process.env;
const CWD = process.cwd();

const browser = await puppeteer.launch({
    executablePath: CHROMIUM_BIN,
    headless: true,
    args: ["--no-sandbox"]
});

const page = await browser.newPage();
await page.setUserAgent(`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_VERSION.split(".", 1)[0]}.0.0.0 Safari/537.36`);
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

const report = await getChangeReport(page, config);
browser.close();

logSummary(report, CHANNEL);

if (DISCORD_WEBHOOK)
    postReport(report, DISCORD_WEBHOOK, CHANNEL);
