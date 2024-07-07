/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CR } from "./types.mts";

export function logSummary(report: CR.ChangeReport, channel: "stable" | "ptb" | "canary") {
    const { deps, src } = report;

    let summary = `# Change Report (${channel === "ptb" ? channel.toUpperCase() : capitalize(channel)})\n`;

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
            section += `### ${count} watched dependenc${count === 1 ? "y" : "ies"} in \`${fileName}\`:\n`;

            if (fileWarns.length > 0)
                section += `\`${fileName}\` has ${fileWarns.length} file-level warning${fileWarns.length === 1 ? "" : "s"}:\n`
                    + formatWarnList(fileWarns);

            if (fileError === undefined) {
                section += passed.length + " passed without warnings.  \n";

                section += warned.length + " passed with warnings";
                if (warned.length > 0) {
                    section += ":  \n";
                    for (const { name, warns } of warned)
                        section += `* The report for \`${name}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                            + formatWarnList(warns);
                } else
                    section += ".  \n";

                section += failed.length + " failed";
                if (failed.length > 0) {
                    section += ":  \n";
                    for (const { name, packageVersionRange, discordVersion, expectedVersionRange, warns } of failed) {
                        section += `* \`${name}\`: Expected range \`${expectedVersionRange}\` given range \`${discordVersion}\``
                            + `, but got range \`${packageVersionRange}\`.\n`;

                        if (warns.length > 0)
                            section += `* The report for \`${name}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                                + formatWarnList(warns);
                        else
                            section += "\n";
                    }
                } else
                    section += ".  \n";

                section += errored.length + " errored";
                if (errored.length > 0) {
                    section += ":  \n";
                    for (const { name, packageVersionRange, discordVersion, expectedVersionRange, error, warns } of errored) {
                        section += `* \`${name}\`: \`${fileName}\` version range: \`${packageVersionRange}\``
                            + `, Found version: \`${discordVersion}\``
                            + `, Expected version range: \`${expectedVersionRange}\`\n`;

                        if (warns.length > 0)
                            section += `* The report for \`${name}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                                + formatWarnList(warns);

                        section += `* The report for \`${name}\` has an error:\n` + formatError(error);
                    }
                } else
                    section += ".  \n";
            } else
                section += `\`${fileName}\` has a file-level error:\n` + formatError(fileError);
        }

        if (fileToLogCount > 0) {
            const fileToNotLogCount = deps.length - fileToLogCount;
            sections += `### ${fileToNotLogCount} file${fileToNotLogCount === 1 ? " has" : "s have"}`
                + " no watched dependencies that failed or have warnings.\n" + section;
        } else
            sections += "### All watched dependencies passed without warnings.\n";
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
            section += `### ${count} watched declaration${count === 1 ? "" : "s"} in \`${fileName}\`:\n`;

            if (fileWarns.length > 0)
                section += `\`${fileName}\` has ${fileWarns.length} file-level warning${fileWarns.length === 1 ? "" : "s"}:\n`
                    + formatWarnList(fileWarns);

            if (fileError === undefined) {
                section += unchanged.length + ` ${unchanged.length === 1 ? "is" : "are"} unchanged without warnings.  \n`;

                section += warned.length + ` ${warned.length === 1 ? "is" : "are"} unchanged with warnings`;
                if (warned.length > 0) {
                    section += ":  \n";
                    for (const { type, identifier, warns } of warned)
                        section += `* The report for ${type} \`${identifier}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                            + formatWarnList(warns);
                } else
                    section += ".  \n";

                section += changed.length + ` ha${changed.length === 1 ? "s" : "ve"} changes`;
                if (changed.length > 0) {
                    section += ":  \n";
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
                                    added += "    * Constructor definition with parameters\n";
                                }
                                if (additions.staticMethodsAndFields.length > 0) {
                                    additionCount += additions.staticMethodsAndFields.length;
                                    added += "    * Static methods and fields:\n" + formatKeyList(additions.staticMethodsAndFields, 3);
                                }
                                if (additions.staticGetters.length > 0) {
                                    additionCount += additions.staticGetters.length;
                                    added += "    * Static getters:\n" + formatKeyList(additions.staticGetters, 3);
                                }
                                if (additions.staticSetters.length > 0) {
                                    additionCount += additions.staticSetters.length;
                                    added += "    * Static setters:\n" + formatKeyList(additions.staticSetters, 3);
                                }
                                if (additions.methods.length > 0) {
                                    additionCount += additions.methods.length;
                                    added += "    * Instance methods:\n" + formatKeyList(additions.methods, 3);
                                }
                                if (additions.getters.length > 0) {
                                    additionCount += additions.getters.length;
                                    added += "    * Getters:\n" + formatKeyList(additions.getters, 3);
                                }
                                if (additions.setters.length > 0) {
                                    additionCount += additions.setters.length;
                                    added += "    * Setters:\n" + formatKeyList(additions.setters, 3);
                                }
                                if (additions.fields.length > 0) {
                                    additionCount += additions.fields.length;
                                    added += "    * Fields:\n" + formatKeyList(additions.fields, 3);
                                }

                                if (removals.constructorDefinition) {
                                    removalCount++;
                                    removed += "    * Constructor definition with parameters\n";
                                }
                                if (removals.staticMethodsAndFields.length > 0) {
                                    removalCount += removals.staticMethodsAndFields.length;
                                    removed += "    * Static methods and fields:\n" + formatKeyList(removals.staticMethodsAndFields, 3);
                                }
                                if (removals.staticGetters.length > 0) {
                                    removalCount += removals.staticGetters.length;
                                    removed += "    * Static getters:\n" + formatKeyList(removals.staticGetters, 3);
                                }
                                if (removals.staticSetters.length > 0) {
                                    removalCount += removals.staticSetters.length;
                                    removed += "    * Static setters:\n" + formatKeyList(removals.staticSetters, 3);
                                }
                                if (removals.methods.length > 0) {
                                    removalCount += removals.methods.length;
                                    removed += "    * Instance methods:\n" + formatKeyList(removals.methods, 3);
                                }
                                if (removals.getters.length > 0) {
                                    removalCount += removals.getters.length;
                                    removed += "    * Getters:\n" + formatKeyList(removals.getters, 3);
                                }
                                if (removals.setters.length > 0) {
                                    removalCount += removals.setters.length;
                                    removed += "    * Setters:\n" + formatKeyList(removals.setters, 3);
                                }
                                if (removals.fields.length > 0) {
                                    removalCount += removals.fields.length;
                                    removed += "    * Fields:\n" + formatKeyList(removals.fields, 3);
                                }

                                break;
                            }
                            case "enum": {
                                const { additions, removals } = changes;

                                const addedEntries = Object.entries(additions);
                                if (addedEntries.length > 0) {
                                    additionCount = addedEntries.length;
                                    added += formatEnumEntryList(addedEntries, 2);
                                }

                                const removedEntries = Object.entries(removals);
                                if (removedEntries.length > 0) {
                                    removalCount = removedEntries.length;
                                    removed += formatEnumEntryList(removedEntries, 2);
                                }

                                break;
                            }
                        }

                        const changeCount = additionCount + removalCount;
                        section += `* ${capitalize(type)} \`${identifier}\` has ${changeCount} change${changeCount === 1 ? "" : "s"}:\n`
                            + `  * ${additionCount} addition${additionCount === 1 ? "" : "s"}`
                            + (additionCount > 0 ? `:\n${added}` : ".\n")
                            + `  * ${removalCount} removal${removalCount === 1 ? "" : "s"}`
                            + (removalCount > 0 ? `:\n${removed}\n` : ".\n\n");

                        if (warns.length > 0)
                            section += `* The report for ${type} \`${identifier}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                                + formatWarnList(warns);
                    }
                } else
                    section += ".  \n";

                section += errored.length + " errored";
                if (errored.length > 0) {
                    section += ":  \n";
                    for (const { type, identifier, warns, error } of errored) {
                        if (warns.length > 0)
                            section += `* The report for ${type} \`${identifier}\` has ${warns.length} warning${warns.length === 1 ? "" : "s"}:\n`
                                + formatWarnList(warns);

                        section += `* The report for ${type} \`${identifier}\` has an error:\n${formatError(error)}`;
                    }
                } else
                    section += ".  \n";
            } else
                section += `\`${fileName}\` has a file-level error:\n${formatError(fileError)}`;
        }

        if (fileToLogCount > 0) {
            const fileToNotLogCount = src.length - fileToLogCount;
            sections += `### ${fileToNotLogCount} file${fileToNotLogCount === 1 ? " has" : "s have"}`
                + " no watched declarations with changes or warnings.\n" + section;
        } else
            sections += "### All watched declarations are unchanged without warnings.\n";
    }

    summary += sections || "## There are 0 watched dependencies and declarations.";

    console.log(summary);
}

function capitalize(string: string) {
    return string.replace(/^./, c => c.toUpperCase());
}

function formatWarnList(warns: string[]) {
    return warns.map(formatError).join("");
}

function formatError(error: string) {
    return `\`\`\`\n${error}\n\`\`\`\n`;
}

function formatKeyList(keys: string[], indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return keys.map(key => indent + `* \`${key}\`\n`).join("");
}

function formatEnumEntryList(entries: [key: string, value: unknown][], indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return entries.map(([key, value]) => indent + `* \`${key} = ${JSON.stringify(value)}\`\n`).join("");
}
