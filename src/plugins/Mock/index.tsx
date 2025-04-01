import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, Menu } from "@webpack/common";
import { MessageActions } from "@webpack/common";

function mockText(text: string): string {
    return text.split("").map((c, i) => 
        i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
    ).join("");
}

const MockIcon = () => (
    <span style={{ fontSize: "16px" }}>💭</span>
);

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }) => {
    if (!message.content) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="vc-mock"
            label="Mock Message"
            icon={MockIcon}
            action={() => {
                const channel = ChannelStore.getChannel(message.channel_id);
                if (channel) {
                    MessageActions.sendMessage(channel.id, {
                        content: mockText(message.content)
                    });
                }
            }}
        />
    ));
};

export default definePlugin({
    name: "Mock",
    description: "Adds a button to mock messages by alternating their case (like 'hEy bRo')",
    authors: [Devs.smuki],
    
    contextMenus: {
        "message": messageCtxPatch
    },

    renderMessagePopoverButton(message) {
        if (!message.content) return null;

        return {
            label: "Mock Message",
            icon: MockIcon,
            message,
            channel: ChannelStore.getChannel(message.channel_id),
            onClick: () => {
                const channel = ChannelStore.getChannel(message.channel_id);
                if (channel) {
                    MessageActions.sendMessage(channel.id, {
                        content: mockText(message.content)
                    });
                }
            }
        };
    }
});