import definePlugin from "../utils/types";

export default definePlugin({
    name: "MessageClicksApi",
    description: "Api required by anything using message click actions",
    author: "Vendicated",
    patches: [{
        find: "if(e.altKey){",
        replacement: {
            match: /\.useClickMessage=function\((.{1,2}),(.{1,2})\).+?function\((.{1,2})\){/,
            replace: (m, message, channel, event) =>
                // the message param is shadowed by the event param, so need to alias them
                `${m.replace("{", `{var _msg=${message};var _chan=${channel};`)}Vencord.Api.MessageClicks._handleClick(_msg, _chan, ${event});`
        }
    }]
});
