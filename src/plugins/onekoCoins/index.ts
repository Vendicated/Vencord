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

export default definePlugin({
    name: "oneko coins",
    description: "oneko but with coins",
    // Listing adryd here because this literally just evals her script
    authors: [Devs.Ven, Devs.adryd,
    {
        id: 351859727568994314n,
        name: "0xGingi"
    },
    ],

    start() {
        const coinCounterEl = document.createElement('div');
        coinCounterEl.id = 'coin-counter';
        coinCounterEl.style.position = 'fixed';
        coinCounterEl.style.right = '10px';
        coinCounterEl.style.bottom = '10px';
        coinCounterEl.textContent = 'Coins: 0';

        document.body.appendChild(coinCounterEl);
        fetch("https://raw.githubusercontent.com/0xGingi/oneko.js/main/oneko.js")
            .then(x => x.text())
            .then(s => s.replace("./oneko.gif", "https://raw.githubusercontent.com/0xGingi/oneko.js/main/oneko.gif")
                .replace("(isReducedMotion)", "(false)"))
            .then(x => x.replace("./coin.gif", "https://raw.githubusercontent.com/0xGingi/oneko.js/main/coin.gif"))
            .then(eval);
    },

    stop() {
        document.getElementById("oneko")?.remove();
        document.getElementById("coin-counter")?.remove();
    }
});
