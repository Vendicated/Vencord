/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { addMessagePreSendListener, MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, useEffect, useState } from "@webpack/common";

let lastState = false;

const settings = definePluginSettings({
    persistState: {
        type: OptionType.BOOLEAN,
        description: "Whether to persist the state of the silent message toggle when changing channels",
        default: false,
        onChange(newValue: boolean) {
            if (newValue === false) lastState = false;
        }
    },
    autoDisable: {
        type: OptionType.BOOLEAN,
        description: "Automatically disable the silent message toggle again after sending one",
        default: true
    }
});

const SilentMessageToggle: ChatBarButtonFactory = ({ isMainChat }) => {
    const [enabled, setEnabled] = useState(lastState);

    function setEnabledValue(value: boolean) {
        if (settings.store.persistState) lastState = value;
        setEnabled(value);
    }

    useEffect(() => {
        const listener: MessageSendListener = (_, message) => {
            if (enabled) {
                if (settings.store.autoDisable) setEnabledValue(false);
                if (!message.content.startsWith("@silent ")) message.content = "@silent " + message.content;
            }
        };

        addMessagePreSendListener(listener);
        return () => void removeMessagePreSendListener(listener);
    }, [enabled]);

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={enabled ? "Disable Silent Message" : "Enable Silent Message"}
            onClick={() => setEnabledValue(!enabled)}
        >
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                style={{ scale: "1.2" }}
            >
                <path fill="currentColor" mask="url(#vc-silent-msg-mask)" d="M18 10.7101C15.1085 9.84957 13 7.17102 13 4c0-.30736.0198-.6101.0582-.907C12.7147 3.03189 12.3611 3 12 3 8.686 3 6 5.686 6 9v5c0 1.657-1.344 3-3 3v1h18v-1c-1.656 0-3-1.343-3-3v-3.2899ZM8.55493 19c.693 1.19 1.96897 2 3.44497 2s2.752-.81 3.445-2H8.55493ZM18.2624 5.50209 21 2.5V1h-4.9651v1.49791h2.4411L16 5.61088V7h5V5.50209h-2.7376Z" />
                {!enabled && <>
                    <mask id="vc-silent-msg-mask">
                        <path fill="#fff" d="M0 0h24v24H0Z" />
                        <path stroke="#000" strokeWidth="5.99068" d="M0 24 24 0" />
                    </mask>
                    <path fill="var(--status-danger)" d="m21.178 1.70703 1.414 1.414L4.12103 21.593l-1.414-1.415L21.178 1.70703Z" />
                </>}
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "SilentMessageToggle",
    authors: [Devs.Nuckyz, Devs.CatNoir],
    description: "Adds a button to the chat bar to toggle sending a silent message.",
    settings,

    renderChatBarButton: SilentMessageToggle,
});
