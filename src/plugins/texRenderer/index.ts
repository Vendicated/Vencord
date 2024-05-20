/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

interface SuccessResponse {
    status: "success";
    log: string; // LaTeX rendering log, usually quite large
    filename: string; // Filename of the generated PNG
}

interface FailureResponse {
    status: "error";
    description: string; // Human readable message of what went wrong
    log?: string; // LaTeX rendering log, not guaranteed to be present
}

type APIResponse = SuccessResponse | FailureResponse;

export default definePlugin({
    name: "TeX Renderer",
    description: "Allows you to send math equations with slash commands using TeX (/tex).",
    authors: [Devs.DSNS],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "tex",
            description: "Render a math equation using TeX notation.",
            options: [{
                name: "equation",
                description: "TeX equation",
                required: true,
                type: ApplicationCommandOptionType.STRING
            }],
            execute: async (args, ctx) => {
                const equation = findOption<string>(args, "equation");

                const LATEX = `
                \\documentclass{article}
                \\usepackage{xcolor}
                \\begin{document}
                \\color{orange}
                \\pagenumbering{gobble}
                $${equation}$
                \\end{document}
                `;

                const res = await fetch("https://rtex.probablyaweb.site/api/v2", {
                    "body": JSON.stringify({
                        "format": "png",
                        "code": LATEX
                    }),
                    "method": "POST",
                }).then(res => res.json()) as APIResponse;

                if (res.status === "error") {
                    sendBotMessage(ctx.channel.id, { content: "Invalid TeX equation." });
                    return;
                }

                return {
                    content: `https://rtex.probablyaweb.site/api/v2/${res.filename}`
                };
            }
        }]
});
