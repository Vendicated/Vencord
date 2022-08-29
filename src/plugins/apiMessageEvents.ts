import definePlugin from "../utils/types";

export default definePlugin({
    name: "MessageEventsAPI",
    description: "Api required by anything using message events.",
    author: "ArjixWasTaken",
    patches: [
        {
            find: "sendMessage:function",
            replacement: {
                match: /(?<=sendMessage:function\(.{1,2},.{1,2},.{1,2},.{1,2}\)){/,
                replace: "{Vencord.Api.MessageEvents._handlePreSend(...arguments);"
            }
        },
        {
            find: "editMessage:function",
            replacement: {
                match: /(?<=editMessage:function\(.{1,2},.{1,2},.{1,2}\)){/,
                replace: "{Vencord.Api.MessageEvents._handlePreEdit(...arguments);"
            }
        },
        {
            find: "if(e.altKey){",
            replacement: {
                match: /\.useClickMessage=function\((.{1,2}),(.{1,2})\).+?function\((.{1,2})\){/,
                replace: (m, message, channel, event) =>
                    // the message param is shadowed by the event param, so need to alias them
                    `${m.replace("{", `{var _msg=${message};var _chan=${channel};`)}Vencord.Api.MessageEvents._handleClick(_msg, _chan, ${event});`
            }
        }
    ]
});
