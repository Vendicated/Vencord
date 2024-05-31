import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, React, getModule } from "@webpack/common";
import { findInReactTree } from "@utils/ReactUtils";

const Message = getModule(m => m?.type?.displayName === 'Message');

const FilterSpamMessage = (props) => {
    const { message } = props;
    const content = message.content.split("\n");

    const cleanedContent = [];
    let prevLine = '';
    let count = 1;

    content.forEach(line => {
        if (line === prevLine) {
            count++;
        } else {
            if (count > 1) {
                cleanedContent.push(`${prevLine} x${count}`);
            } else if (prevLine) {
                cleanedContent.push(prevLine);
            }
            prevLine = line;
            count = 1;
        }
    });

    if (count > 1) {
        cleanedContent.push(`${prevLine} x${count}`);
    } else if (prevLine) {
        cleanedContent.push(prevLine);
    }

    message.content = cleanedContent.join("\n");

    return React.createElement(Message, props);
};

FilterSpamMessage.type = Message.type;
FilterSpamMessage.displayName = Message.displayName;

const FilterSpamPlugin = definePlugin({
    name: "FilterSpamPlugin",
    authors: [Devs.jsh4d],
    description: "Adds a multiplier to repeated messages. Ex: hi[nextline]hi → hi x2",
    patches: [
        {
            find: "type:'MESSAGE_CREATE'",
            replacement: {
                match: /type:'MESSAGE_CREATE',.+?load\s*:\s*\[(.+?)\]/s,
                replace: (match, p1) => `type:'MESSAGE_CREATE',load:[${p1.replace(/Message\(/g, 'FilterSpamMessage(')}]`
            }
        }
    ],
    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", this.onMessageCreate);
    },
    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.onMessageCreate);
    },
    onMessageCreate({ message }) {
        const root = document.querySelector(`.message-2qnXI6[id='chat-messages-${message.id}']`);
        if (!root) return;
        const instance = findInReactTree(root, n => n?.type === Message.type);
        if (instance) {
            const cleanedContent = [];
            let prevLine = '';
            let count = 1;

            message.content.split("\n").forEach(line => {
                if (line === prevLine) {
                    count++;
                } else {
                    if (count > 1) {
                        cleanedContent.push(`${prevLine} x${count}`);
                    } else if (prevLine) {
                        cleanedContent.push(prevLine);
                    }
                    prevLine = line;
                    count = 1;
                }
            });

            if (count > 1) {
                cleanedContent.push(`${prevLine} x${count}`);
            } else if (prevLine) {
                cleanedContent.push(prevLine);
            }

            message.content = cleanedContent.join("\n");
            FluxDispatcher.dispatch({ type: "MESSAGE_UPDATE", message });
        }
    }
});

export default FilterSpamPlugin;
