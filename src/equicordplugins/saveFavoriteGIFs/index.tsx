/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { showNotification } from "@api/Notifications";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { saveFile } from "@utils/web";
import { findComponentByCodeLazy } from "@webpack";
import { UserSettingsActionCreators } from "@webpack/common";

const StarIcon = findComponentByCodeLazy(".73-2.25h6.12l1.9-5.83Z");

async function saveGifs() {
    const filename = `favorite-gifs-${new Date().toISOString().split("T")[0]}.txt`;
    const gifUrls = Object.keys(UserSettingsActionCreators.FrecencyUserSettingsActionCreators.getCurrentValue().favoriteGifs.gifs);
    const content = gifUrls.join("\n");

    try {
        if (IS_DISCORD_DESKTOP) {
            const data = new TextEncoder().encode(content);
            await DiscordNative.fileManager.saveWithDialog(data, filename);
        } else {
            const file = new File([content], filename, { type: "text/plain" });
            saveFile(file);
        }

        showNotification({
            title: "Save Favorite GIFs",
            body: `Saved GIFs successfully as ${filename}`,
        });
    } catch (error) {
        showNotification({
            title: "Save Favorite GIFs",
            body: "Failed to save GIFs",
        });
    }
}

const button: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={"Save Favorite GIFs"}
            onClick={() => saveGifs()}
        >
            <StarIcon height={18} width={18} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "SaveFavoriteGIFs",
    description: "Save favorite GIF urls to a file",
    authors: [Devs.thororen],
    renderChatBarButton: button,
});
