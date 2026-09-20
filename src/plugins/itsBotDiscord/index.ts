/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.   See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "itsBotDiscord",
    description: "Revert Discord's stupidt update of changing Bots to Apps",
    tags: ["Utility"],
    authors: [Devs.John],
    patches: [
        {
            find: "hasFlag:{writable",
            replacement: {
                match: /if\((\i)<=(?:0x40000000|(?:1<<30|1073741824))\)return/,
                replace: "if($1===(1<<20))return false;$&",
            },
        },
    ],
});

const botTag = new MutationObserver(() => {
  document.querySelectorAll(".botText__82f07").forEach(el => {
  if (el.textContent !== "BOT") {
      el.textContent = "BOT";
    }  
  });
});

botTag.observe(document.body, { childList: true, subtree: true });
