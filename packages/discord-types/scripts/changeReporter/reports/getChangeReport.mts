/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { join } from "node:path";

import type { Page } from "puppeteer-core";

import type { CR } from "../types.mts";
import { getDependenciesReport } from "./getDependenciesReport.mjs";
import { getSrcFileReport } from "./getSrcFileReport.mjs";

export async function getChangeReport(page: Page, config: CR.ReporterConfig): Promise<CR.ChangeReport> {
    const { rootDir, deps, src } = config;

    const depsReports: Promise<CR.DependenciesReport>[] = [];
    if (deps)
        for (const filePath in deps)
            depsReports.push(getDependenciesReport(page, join(rootDir, filePath), deps[filePath]!));

    const srcReports: Promise<CR.SrcFileReport>[] = [];
    if (src)
        for (const filePath in src)
            srcReports.push(getSrcFileReport(page, join(rootDir, filePath), src[filePath]!));

    return {
        deps: await Promise.all(depsReports),
        src: await Promise.all(srcReports)
    };
}
