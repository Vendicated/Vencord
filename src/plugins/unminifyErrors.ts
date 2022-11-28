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

let ERROR_CODES: any;
const CODES_URL =
    "https://raw.githubusercontent.com/facebook/react/17.0.2/scripts/error-codes/codes.json";

export default definePlugin({
    name: "ReactErrorDecoder",
    description: 'Replaces "Minifed React Error" with the actual error.',
    authors: [Devs.Cyn],
    patches: [
        {
            find: '"https://reactjs.org/docs/error-decoder.html?invariant="',
            replacement: {
                match: /(function .\(.\)){(for\(var .="https:\/\/reactjs\.org\/docs\/error-decoder\.html\?invariant="\+.,.=1;.<arguments\.length;.\+\+\).\+="&args\[\]="\+encodeURIComponent\(arguments\[.\]\);return"Minified React error #"\+.\+"; visit "\+.\+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings.")}/,
                replace: (_, func, original) =>
                    `${func}{var decoded=Vencord.Plugins.plugins.ReactErrorDecoder.decodeError.apply(null, arguments);if(decoded)return decoded;${original}}`,
            },
        },
    ],

    async start() {
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
    },
});
