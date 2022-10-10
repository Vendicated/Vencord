import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "MessageEventsAPI",
    description: "Api required by anything using message events.",
    authors: [Devs.Arjix],
    patches: [
        {
            find: "sendMessage:function",
            replacement: [{
                match: /(?<=_sendMessage:function\([^)]+\)){/,
                replace: "{Bencord.Api.MessageEvents._handlePreSend(...arguments);"
            }, {
                match: /(?<=\beditMessage:function\([^)]+\)){/,
                replace: "{Bencord.Api.MessageEvents._handlePreEdit(...arguments);"
            }]
        },
        {
            find: "if(e.altKey){",
            replacement: {
                match: /var \w=(\w)\.id,\w=(\w)\.id;return .{1,2}\.useCallback\(\(?function\((.{1,2})\){/,
                replace: (m, message, channel, event) =>
                    // the message param is shadowed by the event param, so need to alias them
                    `var _msg=${message},_chan=${channel};${m}Bencord.Api.MessageEvents._handleClick(_msg, _chan, ${event});`
            }
        }
    ]
});
