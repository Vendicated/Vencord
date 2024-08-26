/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import console from "node:console";
import { writeFile } from "node:fs/promises";
import process from "node:process";

import type { CR } from "../types.mts";
import { capitalize, codeBlock, formatChannel, formatEnumEntryList, formatKeyList, formatWarnList } from "./utils.mjs";

export function logSummary(report: CR.ChangeReport, channel?: string) {
    const { deps, src } = report;

    let summary = `# Change Report (${formatChannel(channel)})\n`;

    let sections = "";

    if (deps.length > 0) {
        sections += `## ${deps.length} file${deps.length === 1 ? "" : "s"} with watched dependencies:\n`;

        let fileToLogCount = 0;
        let section = "";

        for (const report of deps) {
            const { fileName, fileError, fileWarns, passed, warned, failed, errored } = report;

            const toLogCount = warned.length + failed.length + errored.length;
            if (
                toLogCount <= 0
                && fileError === undefined
                && fileWarns.length <= 0
            ) continue;
            fileToLogCount++;

            const count = passed.length + toLogCount;
            section += `### \`${fileName}\`:\n`
                + `${fileWarns.length} file-level warning${fileWarns.length === 1 ? "" : "s"}`
                + (fileWarns.length > 0 ? ":  \n" + formatWarnList(fileWarns) : ".  \n")
                + `${count} watched dependenc${count === 1 ? "y" : "ies"}:  \n`;

            if (fileError === undefined) {
                section += `* ${passed.length} passed without warnings.\n`;

                section += `* ${warned.length} passed with warnings`;
                if (warned.length > 0) {
                    section += ":\n";
                    for (const { name, warns } of warned)
                        section += `  * The report for \`${name}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                            + formatWarnList(warns, 1);
                } else
                    section += ".\n";

                section += `* ${failed.length} failed`;
                if (failed.length > 0) {
                    section += ":\n";
                    for (const { name, packageVersionRange, discordVersion, expectedVersionRange, warns } of failed)
                        section += `  * \`${name}\`: Expected range \`${expectedVersionRange}\` given range \`${discordVersion}\``
                            + `, but got range \`${packageVersionRange}\`.\n`
                            + (warns.length > 0
                                ? `  * The report for \`${name}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                                    + formatWarnList(warns, 1)
                                : "");
                } else
                    section += ".\n";

                section += `* ${errored.length} errored`;
                if (errored.length > 0) {
                    section += ":\n";
                    for (const { name, packageVersionRange, discordVersion, expectedVersionRange, error, warns } of errored)
                        section += `  * \`${name}\`: \`${fileName}\` version range: \`${packageVersionRange}\``
                            + `, Found version: \`${discordVersion}\``
                            + `, Expected version range: \`${expectedVersionRange}\`\n`
                            + (warns.length > 0
                                ? `  * The report for \`${name}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                                    + formatWarnList(warns, 1)
                                : "")
                            + `  * The report for \`${name}\` has an error:\n` + codeBlock(error, 1);
                } else
                    section += ".\n\n";
            } else
                section += "File-level error:  \n" + codeBlock(fileError);
        }

        if (fileToLogCount > 0) {
            const fileToNotLogCount = deps.length - fileToLogCount;
            sections += `### ${fileToNotLogCount} file${fileToNotLogCount === 1 ? " has" : "s have"}`
                + " no file-level errors, file-level warnings, or watched dependencies that failed or have warnings.\n" + section;
        } else
            sections += "### No file-level errors or warnings.\n"
                + "### All watched dependencies passed without warnings.\n";
    }

    if (src.length > 0) {
        sections += `## ${src.length} file${src.length === 1 ? "" : "s"} with watched declarations:\n`;

        let fileToLogCount = 0;
        let section = "";

        for (const report of src) {
            const { fileName, fileError, fileWarns, unchanged, warned, changed, errored } = report;

            const toLogCount = warned.length + changed.length + errored.length;
            if (
                toLogCount <= 0
                && fileError === undefined
                && fileWarns.length <= 0
            ) continue;
            fileToLogCount++;

            const count = unchanged.length + toLogCount;
            section += `### \`${fileName}\`:\n`
                + `${fileWarns.length} file-level warning${fileWarns.length === 1 ? "" : "s"}`
                + (fileWarns.length > 0 ? ":  \n" + formatWarnList(fileWarns) : ".  \n")
                + `${count} watched declaration${count === 1 ? "" : "s"}:  \n`;

            if (fileError === undefined) {
                section += `* ${unchanged.length} ${unchanged.length === 1 ? "is" : "are"} unchanged without warnings.\n`;

                section += `* ${warned.length} ${warned.length === 1 ? "is" : "are"} unchanged with warnings`;
                if (warned.length > 0) {
                    section += ":\n";
                    for (const { type, identifier, warns } of warned)
                        section += `  * The report for ${type} \`${identifier}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                            + formatWarnList(warns, 1);
                } else
                    section += ".\n";

                section += `* ${changed.length} ha${changed.length === 1 ? "s" : "ve"} changes`;
                if (changed.length > 0) {
                    section += ":\n";
                    for (const { type, identifier, changes, warns } of changed) {
                        let additionCount = 0;
                        let added = "";

                        let removalCount = 0;
                        let removed = "";

                        switch (type) {
                            case "class": {
                                const { additions, removals } = changes;

                                if (additions.constructorDefinition) {
                                    additionCount++;
                                    added += "      * Constructor definition with parameters\n";
                                }
                                if (additions.staticMethodsAndFields.length > 0) {
                                    additionCount += additions.staticMethodsAndFields.length;
                                    added += "      * Static methods and fields:\n" + formatKeyList(additions.staticMethodsAndFields, 4);
                                }
                                if (additions.staticGetters.length > 0) {
                                    additionCount += additions.staticGetters.length;
                                    added += "      * Static getters:\n" + formatKeyList(additions.staticGetters, 4);
                                }
                                if (additions.staticSetters.length > 0) {
                                    additionCount += additions.staticSetters.length;
                                    added += "      * Static setters:\n" + formatKeyList(additions.staticSetters, 4);
                                }
                                if (additions.methods.length > 0) {
                                    additionCount += additions.methods.length;
                                    added += "      * Instance methods:\n" + formatKeyList(additions.methods, 4);
                                }
                                if (additions.getters.length > 0) {
                                    additionCount += additions.getters.length;
                                    added += "      * Getters:\n" + formatKeyList(additions.getters, 4);
                                }
                                if (additions.setters.length > 0) {
                                    additionCount += additions.setters.length;
                                    added += "      * Setters:\n" + formatKeyList(additions.setters, 4);
                                }
                                if (additions.fields.length > 0) {
                                    additionCount += additions.fields.length;
                                    added += "      * Fields:\n" + formatKeyList(additions.fields, 4);
                                }

                                if (removals.constructorDefinition) {
                                    removalCount++;
                                    removed += "      * Constructor definition with parameters\n";
                                }
                                if (removals.staticMethodsAndFields.length > 0) {
                                    removalCount += removals.staticMethodsAndFields.length;
                                    removed += "      * Static methods and fields:\n" + formatKeyList(removals.staticMethodsAndFields, 4);
                                }
                                if (removals.staticGetters.length > 0) {
                                    removalCount += removals.staticGetters.length;
                                    removed += "      * Static getters:\n" + formatKeyList(removals.staticGetters, 4);
                                }
                                if (removals.staticSetters.length > 0) {
                                    removalCount += removals.staticSetters.length;
                                    removed += "      * Static setters:\n" + formatKeyList(removals.staticSetters, 4);
                                }
                                if (removals.methods.length > 0) {
                                    removalCount += removals.methods.length;
                                    removed += "      * Instance methods:\n" + formatKeyList(removals.methods, 4);
                                }
                                if (removals.getters.length > 0) {
                                    removalCount += removals.getters.length;
                                    removed += "      * Getters:\n" + formatKeyList(removals.getters, 4);
                                }
                                if (removals.setters.length > 0) {
                                    removalCount += removals.setters.length;
                                    removed += "      * Setters:\n" + formatKeyList(removals.setters, 4);
                                }
                                if (removals.fields.length > 0) {
                                    removalCount += removals.fields.length;
                                    removed += "      * Fields:\n" + formatKeyList(removals.fields, 4);
                                }

                                break;
                            }
                            case "enum": {
                                const { additions, removals } = changes;

                                const addedEntries = Object.entries(additions);
                                if (addedEntries.length > 0) {
                                    additionCount = addedEntries.length;
                                    added += formatEnumEntryList(addedEntries, 3);
                                }

                                const removedEntries = Object.entries(removals);
                                if (removedEntries.length > 0) {
                                    removalCount = removedEntries.length;
                                    removed += formatEnumEntryList(removedEntries, 3);
                                }

                                break;
                            }
                        }

                        const changeCount = additionCount + removalCount;
                        section += `  * ${capitalize(type)} \`${identifier}\` has ${changeCount} change${changeCount === 1 ? "" : "s"}:\n`
                            + `    * ${additionCount} addition${additionCount === 1 ? "" : "s"}`
                            + (additionCount > 0 ? ":\n" + added : ".\n")
                            + `    * ${removalCount} removal${removalCount === 1 ? "" : "s"}`
                            + (removalCount > 0 ? ":\n" + removed : ".\n")
                            + (warns.length > 0
                                ? `  * The report for ${type} \`${identifier}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                                    + formatWarnList(warns, 1)
                                : "");
                    }
                } else
                    section += ".\n";

                section += `* ${errored.length} errored`;
                if (errored.length > 0) {
                    section += ":\n";
                    for (const { type, identifier, warns, error } of errored)
                        section += (warns.length > 0
                            ? `  * The report for ${type} \`${identifier}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                                + formatWarnList(warns, 1)
                            : "")
                            + `  * The report for ${type} \`${identifier}\` has an error:\n` + codeBlock(error, 1);
                } else
                    section += ".\n\n";
            } else
                section += "File-level error:  \n" + codeBlock(fileError);
        }

        if (fileToLogCount > 0) {
            const fileToNotLogCount = src.length - fileToLogCount;
            sections += `### ${fileToNotLogCount} file${fileToNotLogCount === 1 ? " has" : "s have"}`
                + " no file-level errors, file-level warnings, or watched declarations with changes or warnings.\n" + section;
        } else
            sections += "### No file-level errors or warnings.\n"
                + "### All watched declarations are unchanged without warnings.\n";
    }

    summary += sections || "## There are 0 watched dependencies and declarations.\n";

    const { GITHUB_STEP_SUMMARY } = process.env;
    if (GITHUB_STEP_SUMMARY)
        writeFile(GITHUB_STEP_SUMMARY, summary, "utf-8");
    else
        console.log(summary);
}
