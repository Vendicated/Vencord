/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, ChatBarButtonFactory, removeChatBarButton } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import { getCurrentChannel, sendMessage } from "@utils/discord";
import definePlugin from "@utils/types";

async function handleButtonClick() {
    // @ts-expect-error typing issue
    sendMessage(getCurrentChannel().id, { content: "woof" });
}

const ChatBarIcon: ChatBarButtonFactory = () => {
    return (
        <ChatBarButton tooltip="Woof" onClick={handleButtonClick}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 576 512"><path fill="currentColor" d="m309.6 158.5l23.1-138.7C334.6 8.4 344.5 0 356.1 0c7.5 0 14.5 3.5 19 9.5L392 32h52.1c12.7 0 24.9 5.1 33.9 14.1L496 64h56c13.3 0 24 10.7 24 24v24c0 44.2-35.8 80-80 80h-69.3l-5.1 30.5zM416 256.1V480c0 17.7-14.3 32-32 32h-32c-17.7 0-32-14.3-32-32V364.8c-24 12.3-51.2 19.2-80 19.2s-56-6.9-80-19.2V480c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V249.8c-28.8-10.9-51.4-35.3-59.2-66.5L1 167.8c-4.3-17.1 6.1-34.5 23.3-38.8s34.5 6.1 38.8 23.3l3.9 15.5C70.5 182 83.3 192 98 192h205.8zM464 80a16 16 0 1 0-32 0a16 16 0 1 0 32 0" /></svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "Woof",
    description: "Adds a chatbar button to woof in chat",
    authors: [Devs.Samwich],
    start: () => addChatBarButton("Woof", ChatBarIcon),
    stop: () => removeChatBarButton("Woof")
});
