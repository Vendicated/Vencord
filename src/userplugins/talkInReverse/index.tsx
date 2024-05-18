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

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addPreSendListener, removePreSendListener, SendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React, useEffect, useState } from "@webpack/common";

let lastState = false;

const ReverseMessageToggle: ChatBarButton = ({ isMainChat }) => {
    const [enabled, setEnabled] = useState(lastState);

    function setEnabledValue(value: boolean) {
        lastState = value;

        setEnabled(value);
    }

    useEffect(() => {
        const listener: SendListener = async (_, message) => {
            if (enabled && message.content) message.content = message.content.split("").reverse().join("");
        };

        addPreSendListener(listener);
        return () => void removePreSendListener(listener);
    }, [enabled]);

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={enabled ? "Disable Reverse Message" : "Enable Reverse Message"}
            onClick={() => setEnabledValue(!enabled)}
        >
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path fill={enabled ? "var(--green-360)" : "currentColor"} d="M482-160q-134 0-228-93t-94-227v-7l-36 36q-11 11-28 11t-28-11q-11-11-11-28t11-28l104-104q12-12 28-12t28 12l104 104q11 11 11 28t-11 28q-11 11-28 11t-28-11l-36-36v7q0 100 70.5 170T482-240q16 0 31.5-2t30.5-7q17-5 32 1t23 21q8 16 1.5 31.5T577-175q-23 8-47 11.5t-48 3.5Zm-4-560q-16 0-31.5 2t-30.5 7q-17 5-32.5-1T360-733q-8-15-1.5-30.5T381-784q24-8 48-12t49-4q134 0 228 93t94 227v7l36-36q11-11 28-11t28 11q11 11 11 28t-11 28L788-349q-12 12-28 12t-28-12L628-453q-11-11-11-28t11-28q11-11 28-11t28 11l36 36v-7q0-100-70.5-170T478-720Z" /></svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "Talk In Reverse",
    authors: [{
        name: "✨Tolgchu✨",
        id: 329671025312923648n
    }],
    description: "Reverses the message content before sending it.",
    dependencies: ["MessageEventsAPI", "ChatInputButtonAPI"],

    start: () => addChatBarButton("ReverseMessageToggle", ReverseMessageToggle),
    stop: () => removeChatBarButton("ReverseMessageToggle")
});
