/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";

let ERROR_CODES: Record<string, string> | undefined;

export default definePlugin({
    name: "ReactErrorDecoder",
    description: 'Replaces "Minifed React Error" with the actual error.',
    authors: [Devs.Cyn, Devs.maisymoe],
    patches: [
        {
            find: "React has blocked a javascript: URL as a security precaution.",
            replacement: {
                match: /"https:\/\/react.dev\/errors\/"\+\i;/,
                replace: "$&const vcDecodedError=$self.decodeError(...arguments);if(vcDecodedError)return vcDecodedError;"
            }
        }
    ],

    async start() {
        const CODES_URL = `https://raw.githubusercontent.com/facebook/react/v${React.version}/scripts/error-codes/codes.json`;

        ERROR_CODES = await fetch(CODES_URL)
            .then(res => res.json())
            .catch(e => console.error("[ReactErrorDecoder] Failed to fetch React error codes\n", e));
    },

    stop() {
        ERROR_CODES = undefined;
    },

    decodeError(code: number, ...args: any) {
        let index = 0;
        return ERROR_CODES?.[code]?.replace(/%s/g, () => {
            const arg = args[index];
            index++;
            return arg;
        });
    }
});
