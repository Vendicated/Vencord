/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 nin0dev
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

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const badVerbs = ["fuck", " cum", "kill", "destroy"];
const badNouns = ["cunt", "shit", "bullshit", "ass", "bitch", "nigga", "hell", "whore", "dick", "piss", "pussy", "slut", "tit", "cum", "cock", "retard", "blowjob", "bastard", "kotlin", "die", "sex", "nigger", "brainless", "mant", "manti", "mantik", "mantika", "mantikaf", "mantikafa", "mantikafas", "mantikafasi", "boykisser", "mewing", "mew", "skibidi", "gyat", "gyatt", "rizzler", "avast"];
const badVerbsReplacements = ["love", "eat", "deconstruct", "marry", "fart", "teach", "display", "plug", "explode", "undress", "finish", "freeze", "beat", "free", "brush", "allocate", "date", "melt", "breed", "educate", "injure", "change"];
const badNounsReplacements = ["pasta", "kebab", "cake", "potato", "woman", "computer", "java", "hamburger", "monster truck", "osu!", "Ukrainian ball in search of gas game", "Anime", "Anime girl", "good", "keyboard", "NVIDIA RTX 3090 Graphics Card", "storm", "queen", "single", "umbrella", "mosque", "physics", "bath", "virus", "bathroom", "mom", "owner", "airport", "Avast Antivirus Free"];

function replaceBadNouns(content) {

    const regex = new RegExp("\\b(" + badNouns.join("|") + ")\\b", "gi");

    return content.replace(regex, function (match) {
        const randomIndex = Math.floor(Math.random() * badNounsReplacements.length);
        return badNounsReplacements[randomIndex];
    });
}

function replaceBadVerbs(content) {

    const regex = new RegExp("\\b(" + badVerbs.join("|") + ")\\b", "gi");

    return content.replace(regex, function (match) {
        const randomIndex = Math.floor(Math.random() * badVerbsReplacements.length);
        return badVerbsReplacements[randomIndex];
    });
}

export default definePlugin({
    name: "GoodPerson",
    description: "Makes you a good person",
    authors: [Devs.nin0dev],
    dependencies: ["MessageEventsAPI"],

    async start() {
        this.preSend = addPreSendListener((channelId, msg) => {
            const newContent = replaceBadVerbs(replaceBadNouns(msg.content));
            msg.content = newContent;
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
