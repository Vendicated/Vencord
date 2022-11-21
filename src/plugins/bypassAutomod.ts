import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { addPreEditListener, addPreSendListener, MessageObject, removePreEditListener, removePreSendListener } from "../api/MessageEvents";


export default definePlugin({
    name: "Bypass Automod",
    description: "Bypasses the automod",
    version: "1.0.0",
    authors: [Devs.mantikafasi],
    start() {
        return
        
        addPreSendListener((_, msg) => {
            var newMsg = "";
            msg.content.split(" ").forEach((word, _) => {
                if (word.length < 2) return
                let i = Math.round(Math.random() * (word.length - 1));
                console.log(i,word)
                newMsg += word.replace(word[i], word[i] + "\u200C\u2062\u2063\u2064\u200d") + " ";
            });
            msg.content = newMsg.concat();
        });

    }
}
);
