import { Devs } from "../../utils/constants";
import definePlugin from "../../utils/types";

export default definePlugin({
    name: "MessageLogger",
    description: "Temporarily logs deleted and edited messages.",
    authors: [Devs.rushii],

    start() {
        const style = document.createElement("style");
        const styleText = document.createTextNode(".messageLogger-deleted { background-color: rgba(240, 71, 71, 0.15) }");
        style.appendChild(styleText);
        document.body.appendChild(style);
    },

    patches: [
        {
            // MessageStore
            find: "displayName=\"MessageStore\"",
            replacement: [
                {
                    // Add deleted=true to messages in MessageStore instead of removing them
                    match: /MESSAGE_DELETE:function\((\w)\){var .+?((?:\w{1,2}\.){2})getOrCreate.+?},/,
                    replace: "MESSAGE_DELETE:function($1){$2commit($2getOrCreate($1.channelId).update($1.id,m=>m.set('deleted', true)))},"
                }
            ]
        },

        {
            // Base message component
            find: "Message must not be a thread starter message",
            replacement: [
                {
                    // Write message.deleted to "deleted"
                    match: /var (\w)=(\w).id,(?=\w=\w.message)/,
                    replace: "var $1=$2.id,deleted=$2.message.deleted,"
                },
                {
                    // Append messageLogger-deleted to classNames if deleted
                    match: /createElement\("li",{(.+?),className:/,
                    replace: "createElement(\"li\",{$1,className:(deleted ? \"messageLogger-deleted \" : \"\")+"
                }
            ]
        },

        {
            // Message domain model(?)
            find: "isFirstMessageInForumPost=function",
            replacement: [
                {
                    match: /(\w)\.channel_id=(\w)\.channel_id;/,
                    replace: "$1.channel_id=$1.channel_id;$1.deleted=$2.deleted;"
                }
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

        // {
        //     // DEBUG: log getOrCreate return values from MessageStore caching internals
        //     find: "e.getOrCreate=function(t)",
        //     replacement: [
        //         {
        //             match: /getOrCreate=function(.+?)return/,
        //             replace: "getOrCreate=function$1console.log('getOrCreate',n);return"
        //         }
        //     ]
        // },

        // {
        //     // ReferencedMessageStore
        //     find: "displayName=\"ReferencedMessageStore\"",
        //     replacement: [
        //         // {
        //         //     match: /MESSAGE_DELETE:function.+?},/,
        //         //     replace: "MESSAGE_DELETE:function(){},"
        //         // }
        //     ]
        // },

        // {
        //     // MessageStore message transformer(?)
        //     find: "THREAD_STARTER_MESSAGE?null===",
        //     replacement: [
        //         {
        //             match: /function R\(e\){/,
        //             replace: "function R(e){console.log(e);"
        //         }
        //     ]
        // },
    ]
});
