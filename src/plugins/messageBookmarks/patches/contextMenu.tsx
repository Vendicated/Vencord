import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import { Menu, FluxDispatcher } from "@webpack/common";
import { toggleBookmark } from "../utils/bookmarkUtils";

const CONTEXT_MENU_ID = "global-bookmark-message";

export function patchContextMenu() {

    addContextMenuPatch("message", (items, props) => {

        const message = props?.message;
        if (!message?.id || !message?.channel_id) {
            return;
        }

        items.push(
            <Menu.MenuSeparator key="bookmark-separator" />,
            <Menu.MenuItem
                id={CONTEXT_MENU_ID}
                label="Bookmark Message"
                action={() => {
                    try {
                        toggleBookmark({
                            id: message.id,
                            channelId: message.channel_id,
                            guildId: message.guild_id ?? null,
                            content: message.content,
                            authorId: message.author.id,
                            authorName: message.author.username,
                            timestamp: new Date(message.timestamp).getTime()
                        });

                        FluxDispatcher.dispatch({ type: "BOOKMARKS_UPDATED" });
                    } catch (err) {
                        console.error("[MessageBookmarks] Failed to toggle bookmark:", err);
                    }
                }}
            />
        );
    });
}

export function unpatchContextMenu() {
    removeContextMenuPatch("message");
}
