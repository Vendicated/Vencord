import { addClickListener, removeClickListener } from '../api/MessageEvents';
import definePlugin from "../utils/types";
import { find, findByProps } from "../webpack";

let isDeletePressed = false;
const keydown = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = true);
const keyup = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = false);

export default definePlugin({
    name: "MessageQuickActions",
    description: "Quick Delete, Quick edit",
    author: "Vendicated",
    dependencies: ["MessageEventsAPI"],

    start() {
        const { deleteMessage, startEditMessage } = findByProps("deleteMessage");
        const { can } = findByProps("can", "initialize");
        const { Permissions: { MANAGE_MESSAGES } } = find(m => m.Permissions?.MANAGE_MESSAGES);
        const { getCurrentUser } = findByProps("getCurrentUser");

        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);

        this.onClick = addClickListener((msg, chan, event) => {
            const isMe = msg.author.id === getCurrentUser().id;
            if (!isDeletePressed) {
                if (isMe && event.detail >= 2) {
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