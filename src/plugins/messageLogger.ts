import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "MessageLogger",
    description: "Temporarily logs deleted and edited messages.",
    authors: [Devs.rushii],
    patches: [
        {
            // MessageStore
            find: "displayName=\"MessageStore\"",
            replacement: [
                {
                    // Add deleted=true to messages in MessageStore instead of removing them
                    match: /MESSAGE_DELETE:function\((\w)\){var .+?((?:\w{1,2}\.){2})getOrCreate.+?},/,
                    replace: "MESSAGE_DELETE:function($1){$2commit($2getOrCreate($1.id).update($1.id,message=>{message.deleted=true; return message}))},"
                }
            ]
        },

        {
            // ReferencedMessageStore
            find: "displayName=\"ReferencedMessageStore\"",
            replacement: [
                // {
                //     match: /MESSAGE_DELETE:function.+?},/,
                //     replace: "MESSAGE_DELETE:function(){},"
                // }
            ]
        },

        // Reply header renderer
        {
            // Reply branch icon
            find: "M0.809739 3.59646L5.12565 0.468433C5.17446 0.431163 5.23323 0.408043 5.2951",
            replacement: [
                // {
                //     // Prevent rendering replied-to message preview as deleted
                //     // FIXME: could not read stickerItems of undefined
                //     // error at: 673973 w = func
                //     match: /case ((?:\w{1,2}\.){2})LOADED:/,
                //     replace: "case $1LOADED: case $1DELETED:"
                // },
                // {
                //     // Fix jump button on deleted message preview
                //     match: /state!==(?:\w{1,2}\.){2}DELETED\?(\w{1,2}\.onClickReply):void 0/,
                //     replace: "$1"
                // }
            ]
        }
    ]
});
