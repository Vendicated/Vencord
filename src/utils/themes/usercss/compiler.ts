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
        if (v.type === "checkbox" && ["less", "stylus"].includes(preprocessor)) {
            // For Less and Stylus, we convert from 0/1 to false/true as it works with their if statement equivalents.
            // Stylus doesn't really need this to be fair (0/1 are falsy/truthy), but for consistency's sake it's best
            // if we do.
            //
            // In default and USO, it has no special meaning, so we'll just leave it as a number.
            varsToPass[k] = varsToPass[k] === "1" ? "true" : "false";
        }

        if (v.type === "range") {
            varsToPass[k] = `${varsToPass[k]}${v.units ?? "px"}`;
        }
    }

    try {
        return await preprocessorFn(themeData, varsToPass);
    } catch (error) {
        UserCSSLogger.error("File", fileName, "failed to compile with preprocessor", preprocessor, error);
        return null;
    }
}
