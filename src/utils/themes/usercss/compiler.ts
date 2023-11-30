/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { getLess, getStylus } from "@utils/dependencies";
import { Logger } from "@utils/Logger";

import { usercssParse } from ".";

const UserCSSLogger = new Logger("UserCSS:Compiler", "#d2acf5");

const preprocessors: { [preprocessor: string]: (text: string, vars: Record<string, string>) => Promise<string>; } = {
    async default(text: string, vars: Record<string, string>) {
        const variables = Object.entries(vars)
            .map(([name, value]) => `--${name}: ${value}`)
            .join("; ");

        return `/* ==Vencord== */\n:root{${variables}}\n/* ==/Vencord== */${text}`;
    },

    async uso(text: string, vars: Record<string, string>) {
        for (const [k, v] of Object.entries(vars)) {
            text = text.replace(new RegExp(`\\/\\*\\[\\[${k}\\]\\]\\*\\/`, "g"), v);
        }

        return text;
    },

    async stylus(text: string, vars: Record<string, string>) {
        const StylusRenderer = await getStylus();

        const variables = Object.entries(vars)
            .map(([name, value]) => `${name} = ${value}`)
            .join("\n");

        const stylusDoc = `// ==Vencord==\n${variables}\n// ==/Vencord==\n${text}`;

        return new StylusRenderer(stylusDoc).render();
    },

    async less(text: string, vars: Record<string, string>) {
        const less = await getLess();

        const variables = Object.entries(vars)
            .map(([name, value]) => `@${name}: ${value};`)
            .join("\n");

        const lessDoc = `// ==Vencord==\n${variables}\n// ==/Vencord==\n${text}`;

        return less.render(lessDoc).then(r => r.css);
    }
};

export async function compileUsercss(fileName: string) {
    const themeData = await VencordNative.themes.getThemeData(fileName);
    if (!themeData) return null;

    // UserCSS preprocessor order look like this:
    // - use the preprocessor defined
    // - if variables are set, `uso`
    // - otherwise, `default`
    const { vars = {}, preprocessor = Object.keys(vars).length > 0 ? "uso" : "default", id } = await usercssParse(themeData, fileName);

    const preprocessorFn = preprocessors[preprocessor];

    if (!preprocessorFn) {
        UserCSSLogger.error("File", fileName, "requires preprocessor", preprocessor, "which isn't known to Vencord");
        return null;
    }

    const varsToPass = {};

    for (const [k, v] of Object.entries(vars)) {
        varsToPass[k] = Settings.userCssVars[id]?.[k] ?? v.default;

        switch (v.type) {
            case "checkbox": {
                if (["less", "stylus"].includes(preprocessor)) {
                    varsToPass[k] = varsToPass[k] === "1" ? "true" : "false";
                }
                break;
            }

            case "range": {
                varsToPass[k] = `${varsToPass[k]}${v.units ?? "px"}`;
                break;
            }

            case "text": {
                if (preprocessor === "stylus") {
                    varsToPass[k] = `"${varsToPass[k].replace(/"/g, "\" + '\"' + \"")}"`;
                } else {
                    varsToPass[k] = `"${varsToPass[k].replace(/\//g, "\\\\").replace(/"/g, '\\"')}"`;
                }
                break;
            }
        }
    }

    try {
        return await preprocessorFn(themeData, varsToPass);
    } catch (error) {
        UserCSSLogger.error("File", fileName, "failed to compile with preprocessor", preprocessor, error);
        return null;
    }
}
