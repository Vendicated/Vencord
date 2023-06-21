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
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "NewsTicker",
    description: "Adds a ticker to the bottom of your screen, with news.",
    authors: [
        Devs.xyz9021007,
    ],

    options: {
        subreddit: {
            description: "The subreddit to get news from.",
            type: OptionType.STRING,
            default: "news",
            restartNeeded: true,
        },
        limit: {
            description: "The maximum number of posts to get from the subreddit.",
            type: OptionType.NUMBER,
            default: 20,
            restartNeeded: true,
        },
        time: {
            description: "The amount of time in seconds to show all articles in ticker",
            type: OptionType.NUMBER,
            default: 160,
            restartNeeded: true,
        }
    },

    async start() {

        const tickerElement = document.createElement("div");
        tickerElement.id = "ticker";
        tickerElement.style.width = "100%";
        tickerElement.style.backgroundColor = "black";
        tickerElement.style.color = "white";
        tickerElement.style.textAlign = "center";
        tickerElement.style.fontSize = "16px";
        tickerElement.style.fontFamily = "sans-serif";
        tickerElement.style.paddingTop = "5px";
        tickerElement.style.paddingBottom = "4px";
        const root = document.getElementById("app-mount");
        root!.append(tickerElement);

        var articletitles: string[] = [];
        var articlelinks: string[] = [];





        const url = `https://www.reddit.com/r/${Vencord.Settings.plugins.NewsTicker.subreddit}.json?limit=${Vencord.Settings.plugins.NewsTicker.limit.toString()}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                // console.log(data.data.children[0].data.title);
                for (let i = 0; i < data.data.children.length; i++) {
                    if (!articletitles.includes(data.data.children[i].data.title)) {
                        articletitles.push(data.data.children[i].data.title);
                        articlelinks.push(data.data.children[i].data.url);
                    }
                }

                console.log("article titles length" + articletitles.length.toString());
                var tickerHTML = "<div class='rightCSS li'><div style='white-space: nowrap;' class='rightCSS li' id='marqueeone'>";

                for (let i = 0; i < articletitles.length; i++) {
                    tickerHTML = tickerHTML + "<span id='tickerlink" + i.toString() + "'>" + articletitles[i] + "</span>";
                    console.log(articletitles[i]);
                    if (i !== articletitles.length - 1) {
                        tickerHTML += " | ";
                    }
                }
                tickerHTML += "</div></div>";
                tickerElement.innerHTML += tickerHTML;
                tickerElement.innerHTML += `<style>.rightCSS div { position: relative; animation: CSSright linear ${Vencord.Settings.plugins.NewsTicker.time}s infinite; } @keyframes CSSright { 0% { right: -100% } 100% { right: ${document.getElementById("ticker")!.scrollWidth}px } } </style>`;

                const tickerstyle = document.createElement("style");

                for (let i = 0; i < articletitles.length; i++) {
                    console.log("adding listener to tickerlink" + i.toString());
                    document.getElementById("tickerlink" + i.toString())!.addEventListener("click", function() {
                        VencordNative.native.openExternal(articlelinks[i]);
                    });
                    tickerstyle.innerHTML += "#tickerlink" + i.toString() + ":hover { cursor: pointer; text-decoration: underline; }";
                }

                root!.append(tickerstyle);


            });
    },
    stop() {},
});
