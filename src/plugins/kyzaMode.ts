import definePlugin from "../utils/types";
import { addPreSendListener, addPreEditListener, MessageObject, SendListener, EditListener, removePreSendListener, removePreEditListener } from '../api/MessageEvents';

const dictionary = {
    " i ": " I ",
    " i?": " I?",
    " i!": " I!",
    " i.": " I.",
    "i'll": "I'll",
    "i'd": "I'd",
    "Https://": "https://",
}; //dictionary of words and replacements

export default definePlugin({
    name: "KyzaMode",
    description: "Fixes your goofy grammar",
    authors: [{
        name: "DustyAngel47",
        id: 714583473804935238n
    }],

    getPunctuation(msg) {
        const endingChar = msg.slice(-1);
        return (
            endingChar === "." ||
            endingChar === "?" ||
            endingChar === "!" ||
            endingChar === "‽"
        ) ? "" : "."
    },

    correct(msg: string) {
        msg = msg[0].toUpperCase() + msg.slice(1); //make first character uppercase
        msg += this.getPunctuation(msg); //append period to string if punctuation doesn't exist already
        Object.keys(dictionary).forEach(v => {
            msg = msg.replaceAll(v, dictionary[v])
        });
        msg = msg.replaceAll(/(?<=[\.\?\!\‽] )./gm, m => m.toUpperCase()); //handle having multiple sentences (such an advancement of technology!)
        return msg;
    },

    handler(msg: MessageObject) {
        msg.content = this.correct(msg.content);
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.handler(msg));
        this.preEdit = addPreEditListener((_cid, _mid, msg) => this.handler(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    }
})
