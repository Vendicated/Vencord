/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import type { Page } from "puppeteer-core";
import { satisfies, subset, valid, validRange } from "semver";
import type { JsonObject, JsonValue } from "type-fest";

import type { CR } from "../types.mts";
import { funcToString, getErrorStack, pageFunction } from "./utils.mjs";

export async function getDependenciesReport(page: Page, filePath: string, config: CR.DependenciesConfig) {
    const fileName = basename(filePath);
    const fileReport: CR.DependenciesReport = {
        filePath,
        fileName,
        fileWarns: [],
        passed: [],
        warned: [],
        failed: [],
        errored: []
    };

    let dependencies: JsonValue | undefined;
    try {
        dependencies = JSON.parse(await readFile(filePath, "utf-8"))?.dependencies;
    } catch (error) {
        fileReport.fileError = `Failed to read and parse file '${fileName}':\n` + error;
        return fileReport;
    }

    if (
        typeof dependencies !== "object"
        || dependencies === null
        || Array.isArray(dependencies)
    ) {
        fileReport.fileError = `File '${fileName}' does not have a valid dependencies object.`;
        return fileReport;
    }

    for (const key in config) {
        const dependencyConfig = config[key]!;

        const report: CR.DependencyReport = {
            name: key,
            packageVersionRange: undefined,
            discordVersion: undefined,
            expectedVersionRange: undefined,
            error: undefined,
            warns: []
        };

        // https://github.com/microsoft/TypeScript/issues/53395
        const packageVersionRange = (dependencies as JsonObject)[key];
        if (typeof packageVersionRange !== "string") {
            report.error = `File '${fileName}' does not have a dependency with name '${key}'.`;
            fileReport.errored.push(report);
            continue;
        }
        report.packageVersionRange = packageVersionRange;

        if (!validRange(packageVersionRange)) {
            report.error = `Version range '${packageVersionRange}' for dependency '${key}' in file '${fileName}' is invalid.`;
            fileReport.errored.push(report);
            continue;
        }

        let discordVersion: unknown;
        try {
            discordVersion = await page.evaluate<[], CR.FindFunction<[]>>(
                pageFunction(`return ${funcToString(dependencyConfig.find)}.call(Vencord);`)
            );
        } catch (error) {
            report.error = `Find for version of dependency '${key}' errored:\n` + getErrorStack(error);
            fileReport.errored.push(report);
            continue;
        }

        if (typeof discordVersion !== "string") {
            report.error = `Find for version of dependency '${key}' failed.`;
            fileReport.errored.push(report);
            continue;
        }
        report.discordVersion = discordVersion;

        if (!valid(discordVersion)) {
            report.error = `Find for version of dependency '${key}' returned an invalid SemVer version ('${discordVersion}').`;
            fileReport.errored.push(report);
            continue;
        }

        const { overrides } = dependencyConfig;
        const expectedVersionRange = overrides?.find(([range]) => satisfies(discordVersion, range))?.[1]
            ?? discordVersion;
        report.expectedVersionRange = expectedVersionRange;

        if (subset(packageVersionRange, expectedVersionRange)) {
            if (report.warns.length > 0)
                fileReport.warned.push(report);
            else
                fileReport.passed.push(report);
        } else
            fileReport.failed.push(report);
    }

    return fileReport;
}
