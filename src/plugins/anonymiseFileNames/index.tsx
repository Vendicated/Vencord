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

import { Upload } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { useState } from "@webpack/common";

const ActionBarIcon = findByCodeLazy(".actionBarIcon)");

const enum Methods {
    Random,
    Consistent,
    Timestamp,
}

const ANONYMISE_UPLOAD_SYMBOL = Symbol("vcAnonymise");
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
    settings,

    patches: [
        {
            find: 'type:"UPLOAD_START"',
            replacement: {
                match: /await \i\.uploadFiles\((\i),/,
                replace: "$1.forEach($self.anonymise),$&"
            },
        },
        {
            find: 'addFilesTo:"message.attachments"',
            replacement: {
                match: /\i.uploadFiles\((\i),/,
                replace: "$1.forEach($self.anonymise),$&"
            }
        },
        {
            find: "#{intl::ATTACHMENT_UTILITIES_SPOILER}",
            replacement: {
                match: /(?<=children:\[)(?=.{10,80}tooltip:.{0,100}#{intl::ATTACHMENT_UTILITIES_SPOILER})/,
                replace: "arguments[0].canEdit!==false?$self.AnonymiseUploadButton(arguments[0]):null,"
            },
        },
    ],

    AnonymiseUploadButton: ErrorBoundary.wrap(({ upload }: { upload: Upload; }) => {
        const [anonymise, setAnonymise] = useState(upload[ANONYMISE_UPLOAD_SYMBOL] ?? settings.store.anonymiseByDefault);

        function onToggleAnonymise() {
            upload[ANONYMISE_UPLOAD_SYMBOL] = !anonymise;
            setAnonymise(!anonymise);
        }

        return (
            <ActionBarIcon
                tooltip={anonymise ? "Using anonymous file name" : "Using normal file name"}
                onClick={onToggleAnonymise}
            >
                {anonymise
                    ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M17.06 13C15.2 13 13.64 14.33 13.24 16.1C12.29 15.69 11.42 15.8 10.76 16.09C10.35 14.31 8.79 13 6.94 13C4.77 13 3 14.79 3 17C3 19.21 4.77 21 6.94 21C9 21 10.68 19.38 10.84 17.32C11.18 17.08 12.07 16.63 13.16 17.34C13.34 19.39 15 21 17.06 21C19.23 21 21 19.21 21 17C21 14.79 19.23 13 17.06 13M6.94 19.86C5.38 19.86 4.13 18.58 4.13 17S5.39 14.14 6.94 14.14C8.5 14.14 9.75 15.42 9.75 17S8.5 19.86 6.94 19.86M17.06 19.86C15.5 19.86 14.25 18.58 14.25 17S15.5 14.14 17.06 14.14C18.62 14.14 19.88 15.42 19.88 17S18.61 19.86 17.06 19.86M22 10.5H2V12H22V10.5M15.53 2.63C15.31 2.14 14.75 1.88 14.22 2.05L12 2.79L9.77 2.05L9.72 2.04C9.19 1.89 8.63 2.17 8.43 2.68L6 9H18L15.56 2.68L15.53 2.63Z" /></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ transform: "scale(-1,1)" }}><path fill="currentColor" d="M22.11 21.46L2.39 1.73L1.11 3L6.31 8.2L6 9H7.11L8.61 10.5H2V12H10.11L13.5 15.37C13.38 15.61 13.3 15.85 13.24 16.1C12.29 15.69 11.41 15.8 10.76 16.09C10.35 14.31 8.79 13 6.94 13C4.77 13 3 14.79 3 17C3 19.21 4.77 21 6.94 21C9 21 10.68 19.38 10.84 17.32C11.18 17.08 12.07 16.63 13.16 17.34C13.34 19.39 15 21 17.06 21C17.66 21 18.22 20.86 18.72 20.61L20.84 22.73L22.11 21.46M6.94 19.86C5.38 19.86 4.13 18.58 4.13 17C4.13 15.42 5.39 14.14 6.94 14.14C8.5 14.14 9.75 15.42 9.75 17C9.75 18.58 8.5 19.86 6.94 19.86M17.06 19.86C15.5 19.86 14.25 18.58 14.25 17C14.25 16.74 14.29 16.5 14.36 16.25L17.84 19.73C17.59 19.81 17.34 19.86 17.06 19.86M22 12H15.2L13.7 10.5H22V12M17.06 13C19.23 13 21 14.79 21 17C21 17.25 20.97 17.5 20.93 17.73L19.84 16.64C19.68 15.34 18.66 14.32 17.38 14.17L16.29 13.09C16.54 13.03 16.8 13 17.06 13M12.2 9L7.72 4.5L8.43 2.68C8.63 2.17 9.19 1.89 9.72 2.04L9.77 2.05L12 2.79L14.22 2.05C14.75 1.88 15.32 2.14 15.54 2.63L15.56 2.68L18 9H12.2Z" /></svg>
                }
            </ActionBarIcon>
        );
    }, { noop: true }),

    anonymise(upload: Upload) {
        if ((upload[ANONYMISE_UPLOAD_SYMBOL] ?? settings.store.anonymiseByDefault) === false) {
            return;
        }

        const originalFileName = upload.filename;
        const tarMatch = tarExtMatcher.exec(originalFileName);
        const extIdx = tarMatch?.index ?? originalFileName.lastIndexOf(".");
        const ext = extIdx !== -1 ? originalFileName.slice(extIdx) : "";

        const newFilename = (() => {
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
        })();

        upload.filename = newFilename;
    }
});
