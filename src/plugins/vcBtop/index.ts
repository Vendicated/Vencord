import { ApplicationCommandInputType, Argument, CommandContext } from "@api/Commands";
import { sendMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { GuildMemberStore, UserStore } from "@webpack/common";

const Native = VencordNative.pluginHelpers.vcBtop as PluginNative<typeof import("./native")>;

let outgoingRequestSize = 0;
let incomingResponseSize = 0;

(function() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        const clonedResponse = response.clone();

        const requestSize = args[1]?.body ? new TextEncoder().encode(JSON.stringify(args[1].body)).length : 0;
        outgoingRequestSize += requestSize;

        clonedResponse.text().then(body => {
            incomingResponseSize += body.length;
        });

        return response;
    };
})();

(function() {
    const originalXHR = window.XMLHttpRequest;
    function newXHR() {
        const xhr = new originalXHR();
        xhr.addEventListener("load", function() {
            const responseSize = this.responseText.length;
            incomingResponseSize += responseSize;
        });

        const originalSend = xhr.send;
        xhr.send = function(body) {
            const requestSize = body ? body.length : 0;
            outgoingRequestSize += requestSize;
            return originalSend.call(this, body);
        };

        return xhr;
    }
    window.XMLHttpRequest = newXHR;
})();

// Function to get memory usage
const getMemoryUsage = () => {
    const totalMemory = performance.memory.totalJSHeapSize;
    const usedMemory = performance.memory.usedJSHeapSize;
    return {
        used: `${(usedMemory / (1024 * 1024)).toFixed(2)} MB`,
        total: `${(totalMemory / (1024 * 1024)).toFixed(2)} MB`
    };
};

export default definePlugin({
    name: "vcBtop",
    description: "Displays memory usage, CPU load, and network traffic.",
    authors: [Devs.Buzzy],
    commands: [
        {
            name: "vcBtop",
            description: "Display memory usage, CPU load, and network traffic.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (args: Argument[], ctx: CommandContext) => {
                const currentUser = UserStore.getCurrentUser();
                const username = currentUser ? currentUser.username : "Unknown User";

                const memoryUsage = getMemoryUsage();

                const cpuLoad = typeof Native.getCpuUsage === "function" ? await Native.getCpuUsage() : "N/A";

                const message = `\
[34mDiscord[0m

[34mUser:[0m ${username}
[34mCPU Load:[0m ${cpuLoad}%
[34mUsed RAM:[0m ${memoryUsage.used}
[34mTotal RAM:[0m ${memoryUsage.total}
[34mNetwork Traffic:[0m
  - [34mOutgoing Request Size:[0m ${outgoingRequestSize} bytes
  - [34mIncoming Response Size:[0m ${incomingResponseSize} bytes
`;

                sendMessage(ctx.channel.id, {
                    content: `\`\`\`ansi\n${message}\n\`\`\``
                });

                outgoingRequestSize = 0;
                incomingResponseSize = 0;
            }
        }
    ]
});
