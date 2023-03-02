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

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

enum Methods {
    Random,
    Consistent,
    Timestamp,
}

const settings = definePluginSettings({
    method: {
        description: "Anonymising method",
        type: OptionType.SELECT,
        options: [
            { label: "Random Characters", value: Methods.Random, default: true },
            { label: "Consistent", value: Methods.Consistent },
            { label: "Timestamp", value: Methods.Timestamp },
        ],
    },
    randomisedLength: {
        description: "Random characters length",
        type: OptionType.NUMBER,
        default: 7,
        disabled: () => settings.store.method !== Methods.Random,
    },
    consistent: {
        description: "Consistent filename",
        type: OptionType.STRING,
        default: "image",
        disabled: () => settings.store.method !== Methods.Consistent,
    },
});

export default definePlugin({
    name: "AnonymiseFileNames",
    authors: [Devs.obscurity],
    description: "Anonymise uploaded file names",
    settings,
    patches: [
        {
            find: "instantBatchUpload:function",
            replacement: {
                match: /uploadFiles:(.{1,2}),/,
                replace:
                    "uploadFiles:(...args)=>(args[0].uploads.forEach(f=>f.filename=$self.Anonymise(f)),$1(...args)),",
            },
        },
        {
            find: ".Messages.ATTACHMENT_UTILITIES_SPOILER",
            replacement: {
                match: /\{children:\[(\i\?(.{1,60}\)\),).{1,60}function\(\){(.{1,50},(\i)\.id,\i,{))/,
                // TODO: make a buildButton function to minmize the complexity of this patch
                replace: (rest, addButtonFn, rerenderFn, file) =>
                    `{children:[${addButtonFn}tooltip:\"Anonymise Filename\",onClick:function(){${file}.anonymise=!${file}.anonymise; ${rerenderFn}})},children:${file}.anonymise?$self.AnonIcon():$self.NonAnonIcon()}),${rest}`
            }
        }
    ],

    AnonIcon: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#77EA64">
            <path fill="#77EA64" d="M19 6v5H5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            <path stroke="#77EA64" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 11h2m16.5 0H19m0 0V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v5m14 0H5"></path>
            <circle cx="7" cy="17" r="3" fill="#77EA64" stroke="#77EA64" stroke-linecap="round"
                stroke-linejoin="round" stroke-width="2"></circle>
            <circle cx="17" cy="17" r="3" fill="#77EA64" stroke="#77EA64" stroke-linecap="round"
                stroke-linejoin="round" stroke-width="2"></circle>
            <path stroke="#77EA64" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 16h4"></path>
        </svg>
    ),
    NonAnonIcon: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor">
            <path fill="currentColor" d="M19 6v5H5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 11h2m16.5 0H19m0 0V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v5m14 0H5"></path>
            <circle cx="7" cy="17" r="3" fill="currentColor" stroke="currentColor" stroke-linecap="round"
                stroke-linejoin="round" stroke-width="2"></circle>
            <circle cx="17" cy="17" r="3" fill="currentColor" stroke="currentColor" stroke-linecap="round"
                stroke-linejoin="round" stroke-width="2"></circle>
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 16h4"></path>
        </svg>
    ),

    Anonymise(file) {
        if (!file.anonymise) return file.filename;

        const originalName = file.filename;
        const extIdx = originalName.lastIndexOf(".");
        const ext = extIdx !== -1 ? originalName.slice(extIdx) : "";

        let name = "";
        switch (settings.store.method) {
            case Methods.Random:
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                name = Array.from(
                    { length: settings.store.randomisedLength },
                    () => chars[Math.floor(Math.random() * chars.length)]
                ).join("");
                break;
            case Methods.Consistent:
                name = settings.store.consistent;
                break;
            case Methods.Timestamp:
                name = Date.now().toString();
                break;
        }
        return name + ext;
    },
});
