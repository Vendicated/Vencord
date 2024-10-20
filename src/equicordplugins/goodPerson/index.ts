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
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

/** * SEXUAL ***/
const badVerbsSexual = ["fuck", "cum"];
const badNounsSexual = ["cunt", "yuri", "whore", "dick", "pussy", "slut", "tit", "cum", "cock", "blowjob", "sex", "ass", "furry", "bewbs", "boob", "booba", "boobies", "boobs", "booby", "porn", "pron", "pronhub", "r34", "rape", "raped", "raping", "rapist"];
/** * BRAINROT ***/
const badNounsBrainrot = ["mewing", "mew", "skibidi", "gyat", "gyatt", "rizzler", "nettspend", "boykisser", "ohio", "rizz", "tickle my toes bruh", "crack my spine like a whip", "hawk tuah"];
/** * SLURS ***/
const badNounsSlurs = ["retard", "faggot", "fag", "faggots", "fags", "retards", "n*g", "n*gg*", "n*gg*r"];
const badRegexesSlurs = ["\\bn{1,}(i|!|1){1,}(b|g){2,}(a|@|e|3){1,}?"];
/** * GENERAL ***/
const badVerbsGeneral = ["kill", "destroy"];
const badNounsGeneral = ["shit", "bullshit", "bitch", "bastard", "die", "brainless"];
/** * FUN ***/
const badNounsFun = ["kotlin", "avast", "fres"];
/** * REPLACEMENTS ***/
const badVerbsReplacements = ["love", "eat", "deconstruct", "marry", "fart", "teach", "display", "plug", "explode", "undress", "finish", "freeze", "beat", "free", "brush", "allocate", "date", "melt", "breed", "educate", "injure", "change"];
const badNounsReplacements = ["pasta", "kebab", "cake", "potato", "woman", "computer", "java", "hamburger", "monster truck", "osu!", "Ukrainian ball in search of gas game", "Anime", "Anime girl", "good", "keyboard", "NVIDIA RTX 3090 Graphics Card", "storm", "queen", "single", "umbrella", "mosque", "physics", "bath", "virus", "bathroom", "mom", "owner", "airport", "Avast Antivirus Free"];

export default definePlugin({
    name: "GoodPerson",
    description: "Makes you (or others) a good person",
    authors: [Devs.nin0dev, Devs.mantikafasi],
    dependencies: ["MessageEventsAPI"],
    settings: definePluginSettings({
        incoming: {
            type: OptionType.BOOLEAN,
            description: "Filter incoming messages",
            default: true
        },
        blockSexual: {
            type: OptionType.BOOLEAN,
            description: "Block sexual words/hornyspeak",
            default: true
        },
        blockBrainrot: {
            type: OptionType.BOOLEAN,
            description: "Block things commonly said by Gen Alpha children",
            default: true
        },
        blockSlurs: {
            type: OptionType.BOOLEAN,
            description: "Block targeted slurs",
            default: true
        },
        blockInsults: {
            type: OptionType.BOOLEAN,
            description: "Block more general insults",
            default: true
        },
        blockOthers: {
            type: OptionType.BOOLEAN,
            description: "Block words mantikafasi personally dislikes",
            default: true
        }
    }),
    async start() {
        this.preSend = addPreSendListener((_channelId, msg) => {
            const newContent = this.replaceBadVerbs(this.replaceBadNouns(msg.content));
            msg.content = newContent;
        });
    },
    stop() {
        removePreSendListener(this.preSend);
    },
    getEnabledBadNouns() {
        const thingToReturn: string[] = [];
        if (this.settings.store.blockBrainrot) thingToReturn.push(...badNounsBrainrot);
        if (this.settings.store.blockInsults) thingToReturn.push(...badNounsGeneral);
        if (this.settings.store.blockOthers) thingToReturn.push(...badNounsFun);
        if (this.settings.store.blockSexual) thingToReturn.push(...badNounsSexual);
        if (this.settings.store.blockSlurs) thingToReturn.push(...badNounsSlurs);
        return thingToReturn;
    },
    getEnabledBadVerbs() {
        const thingToReturn: string[] = [];
        if (this.settings.store.blockSexual) thingToReturn.push(...badVerbsSexual);
        if (this.settings.store.blockInsults) thingToReturn.push(...badVerbsGeneral);
        return thingToReturn;
    },
    replaceBadNouns(content) {
        const regex = new RegExp("\\b(" + this.getEnabledBadNouns().join("|") + ")\\b", "gi");

        return content.replace(regex, function (match) {
            const randomIndex = Math.floor(Math.random() * badNounsReplacements.length);
            return badNounsReplacements[randomIndex];
        });
    },
    replaceBadVerbs(content) {
        const regex = new RegExp("\\b(" + this.getEnabledBadVerbs().join("|") + ")\\b", "gi");

        return content.replace(regex, function (match) {
            const randomIndex = Math.floor(Math.random() * badVerbsReplacements.length);
            return badVerbsReplacements[randomIndex];
        });
    },
    flux: {
        async MESSAGE_CREATE
            ({ guildId, message }) {
            const msg = message;
            // @ts-ignore
            let newMessageContent = Vencord.Plugins.plugins.GoodPerson.replaceBadVerbs(Vencord.Plugins.plugins.GoodPerson.replaceBadNouns(msg.content));
            if (message.content !== newMessageContent) {
                newMessageContent += "\n-# <:husk:1280158956341297225> **GoodPerson made this message good. Reload your client to clear changes**";
                msg.content = newMessageContent;
                FluxDispatcher.dispatch({
                    type: "MESSAGE_UPDATE",
                    message: msg,
                    guildId
                });
            }
        },
        async MESSAGE_UPDATE
            ({ guildId, message }) {
            const msg = message;
            // @ts-ignore
            let newMessageContent = Vencord.Plugins.plugins.GoodPerson.replaceBadVerbs(Vencord.Plugins.plugins.GoodPerson.replaceBadNouns(msg.content));
            if (message.content !== newMessageContent) {
                newMessageContent += "\n-# <:husk:1280158956341297225> **GoodPerson made this message good. Reload your client to clear changes**";
                msg.content = newMessageContent;
                FluxDispatcher.dispatch({
                    type: "MESSAGE_UPDATE",
                    message: msg,
                    guildId
                });
            }
        }
    }
});
