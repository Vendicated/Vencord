import { addClickListener, removeClickListener } from '../api/MessageEvents';
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { find, findByProps } from "../webpack";
import { UserStore } from "../webpack/common";

let isDeletePressed = false;
const keydown = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = true);
const keyup = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = false);

export default definePlugin({
    name: "MessageQuickActions",
    description: "Quick Delete, Quick edit",
    authors: [Devs.Ven],
    dependencies: ["MessageEventsAPI"],

    start() {
        const { deleteMessage, startEditMessage } = findByProps("deleteMessage");
        const { can } = findByProps("can", "initialize");
        const { MANAGE_MESSAGES } = find(m => typeof m.MANAGE_MESSAGES === "bigint");
        const { isEditing } = findByProps("isEditing");

        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);

        this.onClick = addClickListener((msg, chan, event) => {
            const isMe = msg.author.id === UserStore.getCurrentUser().id;
            if (!isDeletePressed) {
                if (isMe && event.detail >= 2 && !isEditing(chan.id, msg.id)) {
                    startEditMessage(chan.id, msg.id, msg.content);
                    event.preventDefault();
                }
            } else if (isMe || can(MANAGE_MESSAGES, chan)) {
                deleteMessage(chan.id, msg.id);
                event.preventDefault();
            }
        });
    },

    stop() {
        removeClickListener(this.onClick);
        document.removeEventListener("keydown", keydown);
        document.removeEventListener("keyup", keyup);
    }
});
