

import { addPreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const keys = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export default definePlugin({
    name: "Typso",
    description: "Mke yoyr fruends thibk you'te typinf woth yoyr toes!",
    version: "1.0.0",
    authors: [Devs.mantikafasi],
    start() {

        addPreSendListener((_, msg) => {
            var newMsg = "";
            let guh = false;
            msg.content.split(" ").forEach((word, _) => {
                if (guh || word.includes("https://") || word.includes("http://") || word.includes("www.") || word.includes("<@")) {guh = false;return newMsg += word.concat(" ")};
                guh = true;

                const random = Math.round(Math.random() * word.length);
                var char = word.charAt(random).toLowerCase();
                var randomChar = "";

                for (let i = 0; i < keys.length; i++) {
                    if (keys[i].includes(char)) {
                        randomChar = keys[Math.max(0,Math.min(2,i + [1,-1][Math.round(Math.random())]))].charAt(Math.round(keys[i].indexOf(char) + [1,-1][Math.round(Math.random())]));
                        break;
                    }
                }

                newMsg += word.slice(0, random) + randomChar + word.slice(random + 1, word.length) + " ";
            });
            msg.content = newMsg.concat();
        });

    }
}
);
