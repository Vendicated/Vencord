/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";

export default definePlugin({
    name: "ezCalculate",
    description: "A simple way to solve equations via Vencord.",
    authors: [Devs.jsh4d],
    patches: [],
    start() {
        const calculateCommand = {
            name: "calculate",
            description: "Perform a mathematical calculation",
            options: [
                {
                    type: 3,
                    name: "expression",
                    description: "Mathematical expression to evaluate",
                    required: true,
                },
            ],
            async execute(args) {
                const expression = args[0].value;
                try {
                    const allowedGlobals = {
                        Math,
                        sin: Math.sin,
                        cos: Math.cos,
                        tan: Math.tan,
                        asin: Math.asin,
                        acos: Math.acos,
                        atan: Math.atan,
                        sqrt: Math.sqrt,
                        pow: Math.pow,
                        abs: Math.abs,
                        exp: Math.exp,
                        log: Math.log,
                        PI: Math.PI,
                        E: Math.E
                    };
                    const result = new Function(
                        ...Object.keys(allowedGlobals),
                        `return ${expression}`
                    )(...Object.values(allowedGlobals));
                    
                    return `Result: ${result}`;
                } catch (error) {
                    return `Error: ${error.message}`;
                }
            },
        };
        Vencord.commands.registerCommand(calculateCommand);
    },
    stop() {
        Vencord.commands.unregisterCommand("calculate");
    },
});
