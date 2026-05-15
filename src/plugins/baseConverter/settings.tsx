/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { OptionType } from "@utils/types";

import { openBaseConverterModal } from "./BaseConverterModal";
import { DECODE_OPTIONS, ENCODE_OPTIONS } from "./utils";

export const settings = definePluginSettings({
    receiveEncoding: {
        type: OptionType.SELECT,
        description: "Encoding to decode received messages from",
        options: DECODE_OPTIONS,
        default: "auto",
        hidden: true,
    },
    sendEncoding: {
        type: OptionType.SELECT,
        description: "Encoding to use for outgoing messages",
        options: ENCODE_OPTIONS,
        default: "binary",
        hidden: true,
    },
    autoDecodeReceived: {
        type: OptionType.BOOLEAN,
        description: "Automatically decode encoded incoming messages (uses Auto-Detect unless a specific encoding is chosen)",
        default: false,
    },
    autoEncodeOutgoing: {
        type: OptionType.BOOLEAN,
        description: "Automatically encode your messages before sending. Shift+click or right-click the chat bar button to toggle",
        default: false,
    },
    aesSecret: {
        type: OptionType.STRING,
        description: "Shared AES-256-GCM secret key — both users must use the same value. Stored in plain text in Vencord settings.",
        default: "",
        hidden: true,
    },
    manageSettings: {
        type: OptionType.COMPONENT,
        component: () => (
            <Button onClick={openBaseConverterModal}>
                Customize encoding settings
            </Button>
        ),
    },
}).withPrivateSettings<{
    userKeys: Record<string, string>;
}>();
