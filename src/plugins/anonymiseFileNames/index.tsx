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

import type { CloudUpload } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { UploadAttachmentActionCreators } from "@webpack/common";

type AnonUpload = CloudUpload & { anonymise?: boolean; };

const ActionBarIcon = findByCodeLazy(".actionBarIcon)");

const enum Methods {
    Random,
    Consistent,
    Timestamp,
}

const tarExtMatcher = /\.tar\.\w+$/;

const settings = definePluginSettings({
    anonymiseByDefault: {
        description: "Whether to anonymise file names by default",
        type: OptionType.BOOLEAN,
        default: true,
    },
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
    authors: [Devs.fawn],
    description: "Anonymise uploaded file names",
    patches: [
        {
            find: "instantBatchUpload:function",
            replacement: {
                match: /uploadFiles:(\i),/,
                replace:
                    "uploadFiles:(...args)=>(args[0].uploads.forEach(f=>f.filename=$self.anonymise(f)),$1(...args)),",
            },
        },
        {
            find: 'addFilesTo:"message.attachments"',
            replacement: {
                match: /(\i.uploadFiles\((\i),)/,
                replace: "$2.forEach(f=>f.filename=$self.anonymise(f)),$1"
            }
        },
        {
            find: ".Messages.ATTACHMENT_UTILITIES_SPOILER",
            replacement: {
                match: /(?<=children:\[)(?=.{10,80}tooltip:.{0,100}\i\.\i\.Messages\.ATTACHMENT_UTILITIES_SPOILER)/,
                replace: "arguments[0].canEdit!==false?$self.renderIcon(arguments[0]):null,"
            },
        },
    ],
    settings,

    renderIcon: ErrorBoundary.wrap(({ upload, channelId, draftType }: { upload: AnonUpload; draftType: unknown; channelId: string; }) => {
        const anonymise = upload.anonymise ?? settings.store.anonymiseByDefault;
        return (
            <ActionBarIcon
                tooltip={anonymise ? "Using anonymous file name" : "Using normal file name"}
                onClick={() => {
                    upload.anonymise = !anonymise;
                    UploadAttachmentActionCreators.update(channelId, upload.id, draftType, {}); // dummy update so component rerenders
                }}
            >
                {anonymise
                    ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.06 13c-1.86 0-3.42 1.33-3.82 3.1-.95-.41-1.82-.3-2.48-.01C10.35 14.31 8.79 13 6.94 13 4.77 13 3 14.79 3 17s1.77 4 3.94 4c2.06 0 3.74-1.62 3.9-3.68.34-.24 1.23-.69 2.32.02.18 2.05 1.84 3.66 3.9 3.66 2.17 0 3.94-1.79 3.94-4s-1.77-4-3.94-4M6.94 19.86c-1.56 0-2.81-1.28-2.81-2.86s1.26-2.86 2.81-2.86c1.56 0 2.81 1.28 2.81 2.86s-1.25 2.86-2.81 2.86m10.12 0c-1.56 0-2.81-1.28-2.81-2.86s1.25-2.86 2.81-2.86 2.82 1.28 2.82 2.86-1.27 2.86-2.82 2.86M22 10.5H2V12h20v-1.5m-6.47-7.87c-.22-.49-.78-.75-1.31-.58L12 2.79l-2.23-.74-.05-.01c-.53-.15-1.09.13-1.29.64L6 9h12l-2.44-6.32-.03-.05Z" /></svg>
                    : <svg viewBox="0 0 24 24" fill="currentColor" transform="scale(-1 1)"><path d="M22.11 21.46 2.39 1.73 1.11 3l5.2 5.2L6 9h1.11l1.5 1.5H2V12h8.11l3.39 3.37c-.12.24-.2.48-.26.73-.95-.41-1.83-.3-2.48-.01C10.35 14.31 8.79 13 6.94 13 4.77 13 3 14.79 3 17s1.77 4 3.94 4c2.06 0 3.74-1.62 3.9-3.68.34-.24 1.23-.69 2.32.02.18 2.05 1.84 3.66 3.9 3.66.6 0 1.16-.14 1.66-.39l2.12 2.12 1.27-1.27m-15.17-1.6c-1.56 0-2.81-1.28-2.81-2.86 0-1.58 1.26-2.86 2.81-2.86 1.56 0 2.81 1.28 2.81 2.86 0 1.58-1.25 2.86-2.81 2.86m10.12 0c-1.56 0-2.81-1.28-2.81-2.86 0-.26.04-.5.11-.75l3.48 3.48c-.25.08-.5.13-.78.13M22 12h-6.8l-1.5-1.5H22V12m-4.94 1c2.17 0 3.94 1.79 3.94 4 0 .25-.03.5-.07.73l-1.09-1.09c-.16-1.3-1.18-2.32-2.46-2.47l-1.09-1.08c.25-.06.51-.09.77-.09M12.2 9 7.72 4.5l.71-1.82c.2-.51.76-.79 1.29-.64l.05.01 2.23.74 2.22-.74c.53-.17 1.1.09 1.32.58l.02.05L18 9h-5.8Z" /></svg>
                }
            </ActionBarIcon>
        );
    }, { noop: true }),

    anonymise(upload: AnonUpload) {
        if ((upload.anonymise ?? settings.store.anonymiseByDefault) === false) return upload.filename;

        const file = upload.filename;
        const tarMatch = tarExtMatcher.exec(file);
        const extIdx = tarMatch?.index ?? file.lastIndexOf(".");
        const ext = extIdx !== -1 ? file.slice(extIdx) : "";

        switch (settings.store.method) {
            case Methods.Random:
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                return Array.from(
                    { length: settings.store.randomisedLength },
                    () => chars[Math.floor(Math.random() * chars.length)]
                ).join("") + ext;
            case Methods.Consistent:
                return settings.store.consistent + ext;
            case Methods.Timestamp:
                return Date.now() + ext;
        }
    },
});
