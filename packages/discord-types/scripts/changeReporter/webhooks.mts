/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CR } from "./types.mts";
import { codeBlock, formatChannel, getSummaryURL } from "./utils.mjs";

export async function postError(
    error: Error,
    webhookURL: string | undefined,
    channel?: string | undefined
) {
    if (!webhookURL) return;

    const res = await fetch(webhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: "Change Reporter",
            embeds: [{
                title: `Change Report (${formatChannel(channel)})`,
                description: "### Fatal error:\n" + codeBlock(error.stack),
                url: getSummaryURL(channel),
                color: 0xF23F42
            }]
        })
    });

    if (!res.ok)
        console.error(`Failed to exectute webhook (status '${res.status} ${res.statusText}').`);
}

export async function postReport(
    report: CR.ChangeReport,
    webhookURL: string,
    channel?: string | undefined
) {
    const { deps, src } = report;

    let areChanges = false;
    let description = "";

    if (deps.length > 0) {
        let passedCount = 0;
        let warnedCount = 0;
        let failedCount = 0;
        let erroredCount = 0;
        for (const report of deps) {
            passedCount += report.passed.length;
            warnedCount += report.warned.length;
            failedCount += report.failed.length;
            erroredCount += report.errored.length;
        }
        const toLogCount = warnedCount + failedCount + erroredCount;
        const count = passedCount + toLogCount;
        if (count > 0) {
            description += "### Dependencies:\n";
            if (toLogCount > 0) {
                areChanges = true;
                description += `${count} watched dependenc${count === 1 ? "y" : "ies"} in ${deps.length} file${deps.length === 1 ? "" : "s"}:\n`
                    + `* ${passedCount} passed without warnings.\n`
                    + `* ${warnedCount} passed with warnings.\n`
                    + `* ${failedCount} failed.\n`
                    + `* ${erroredCount} errored.\n`;
            } else
                description += "All watched dependencies passed without warnings.\n";
        }
    }

    if (src.length > 0) {
        let unchangedCount = 0;
        let warnedCount = 0;
        let changedCount = 0;
        let erroredCount = 0;
        for (const report of src) {
            unchangedCount += report.unchanged.length;
            warnedCount += report.warned.length;
            changedCount += report.changed.length;
            erroredCount += report.errored.length;
        }
        const toLogCount = warnedCount + changedCount + erroredCount;
        const count = unchangedCount + toLogCount;
        if (count > 0) {
            description += "### Declarations:\n";
            if (toLogCount > 0) {
                areChanges = true;
                description += `${count} watched declaration${count === 1 ? "" : "s"} in ${src.length} file${src.length === 1 ? "" : "s"}:\n`
                    + `* ${unchangedCount} ${unchangedCount === 1 ? "is" : "are"} unchanged without warnings.\n`
                    + `* ${warnedCount} ${warnedCount === 1 ? "is" : "are"} unchanged with warnings.\n`
                    + `* ${changedCount} ha${changedCount === 1 ? "s" : "ve"} changes.\n`
                    + `* ${erroredCount} errored.\n`;
            } else
                description += "All watched declarations are unchanged without warnings.\n";
        }
    }

    description ||= "### There are 0 watched dependencies and declarations.\n";

    const res = await fetch(webhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: "Change Reporter",
            embeds: [{
                title: `Change Report (${formatChannel(channel)})`,
                description,
                url: getSummaryURL(channel),
                color: areChanges ? 0xF0B132 : 0x23A559
            }]
        })
    });

    if (!res.ok)
        console.error(`Failed to exectute webhook (status '${res.status} ${res.statusText}').`);
}
