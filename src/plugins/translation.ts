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

import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

import * as Locales from "../locales/index.ts";

export default definePlugin({
    name: "Translations",
    description: "Loads additional languages",
    authors: [Devs.tbodt],
    patches: [
        // list of locales
        {
            find: '"name":"English, US"',
            replacement: {
                match: "')",
                replace: "').concat(Vencord.Plugins.plugins.Translations.metadata())",
            },
        },
        // locale messages resolver
        {
            find: '"./pt-BR.json":[',
            replacement: {
                match: /function (.{1,2})\((.{1,2})\){/,
                replace: (_, f, e) => `function ${f}(${e}){let msgs=Vencord.Plugins.plugins.Translations.messages(${e});if(msgs)return Promise.resolve({'default':msgs});`,
            },
        },
        // website locale messages resolver
        {
            find: '"./es-ES":',
            replacement: {
                match: /function (.{1,2})\((.{1,2})\){/,
                replace: (_, f, e) => `function ${f}(${e}){let msgs=Vencord.Plugins.plugins.Translations.websiteMessages(${e});if(msgs)return msgs;`,
            },
        },
        // momentjs
        // {
        //     find: '"./x-pseudo":',
        //     replacement: {
        //         match: /throw \w{1,2}/,
        //         replace: `e='./eo';`,
        //     },
        // },
        // non moment date formats
        {
            find: '"zh-CN":function',
            all: true,
            replacement: {
                match: '}}}',
                replace: '}};r["tok"]=r["en-US"];}',
            },
        },
        // block uploading locale to server
        // {
        //     find: 'Persisting proto',
        //     replacement: {
        //         match: /\b(\w{1,2})\.logger\.log\("Persisting proto"\);/,
        //         replace: (_, r) => `if(${r}.getEditInfo().editInfo.protoToSave.localization.locale!==undefined)return;${r}.logger.log("Persisting proto");`,
        //     },
        // },
        // stop the server from overriding our locale
        {
            find: 'UserSettingsProto must not be a string',
            replacement: {
                match: /\w{1,2}\(\{type:"USER_SETTINGS_PROTO_UPDATE",settings:{proto:(\w{1,2}),[^;]{1,50};/,
                replace: (a, p) => `Vencord.Plugins.plugins.Translations.fixLocaleSetting(${p});${a}`,
            },
        },
        // also stop the server from overriding our locale
        {
            find: 'Proto was out of date, discarding changes',
            replacement: {
                match: /(Proto was out of date, discarding changes.{0,200};)(.{0,20}\(\{type:"USER_SETTINGS_PROTO_UPDATE",\s?settings:\{proto:(\w{1,2}),)/,
                replace: (_, a, b, p) => `${a}Vencord.Plugins.plugins.Translations.fixLocaleSetting(${p});${b}`,
            },
        },
        // also also stop the server from overriding our locale
        {
            find: 'loadIfNecessary=function',
            replacement: {
                match: /;[^;]{0,20}\(\{type:"USER_SETTINGS_PROTO_UPDATE",settings:\{.{0,100},proto:(\w{1,2})\}[^;]{0,100};[^;]{0,50}markDirtyFromMigration/,
                replace: (a, p) => `;Vencord.Plugins.plugins.Translations.fixLocaleSetting(${p})${a}`,
            },
        },
        // oh my god how many different ways are there for the server to send the user settings proto
        {
            find: 'type:"CONNECTION_OPEN"',
            replacement: {
                match: /\w{1,2}\(\{type:"CONNECTION_OPEN",[^}]{0,1000},userSettingsProto:(\w{1,2})/,
                replace: (a, p) => `Vencord.Plugins.plugins.Translations.fixLocaleSetting(${p});${a}`,
            },
        },
    ],

    metadata() {
        return Object.values(Locales).map(({ code, name }) => ({ code, name, enabled: true }));
    },

    messages(locale) {
        let match = /\.\/(\w+)(\.json)?/.exec(locale);
        if (match && match[1] in Locales)
            return Locales[match[1]].messages;
    },

    websiteMessages(locale) {
        let match = /\.\/(\w+)(\.json)?/.exec(locale);
        if (match && match[1] in Locales)
            return {};
    },

    fixLocaleSetting(proto) {
        if (proto === undefined)
            return;
        let prevLocale = Vencord.Webpack.findByProps("_chosenLocale").getLocale();
        if (prevLocale in Locales)
            proto.localization.locale.value = prevLocale;
    },
});
