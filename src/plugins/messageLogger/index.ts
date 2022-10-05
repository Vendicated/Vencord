import { Devs } from "../../utils/constants";
import definePlugin from "../../utils/types";

export default definePlugin({
    name: "MessageLogger",
    description: "Temporarily logs deleted and edited messages.",
    authors: [Devs.rushii],

    start() {
        // TODO: move to separate css file when supported
        const css = `
            .messageLogger-deleted {
                background-color: rgba(240, 71, 71, 0.15)
            }

            .theme-dark .messageLogger-edited {
                filter: brightness(85%);
            }

            .theme-light .messageLogger-edited {
                opacity: 0.5;
            }

            .messageLogger-editedTimestamp {
                color: var(--text-muted);
                margin-left: 0.25rem;
                font-size: 0.75rem;
                line-height: 1.375rem;
                height: 1.25rem
                vertical-align: baseline;
                font-weight: 500;
                pointer-events: none;
            }
        `;

        const style = document.createElement("style");
        const styleText = document.createTextNode(css);
        style.appendChild(styleText);
        document.body.appendChild(style);
    },

    // Based on canary 56c8103413aa1add076201dbf622f8d26b48df9c
    patches: [
        {
            // MessageStore
            // Module 171447
            find: "displayName=\"MessageStore\"",
            replacement: [
                {
                    // Add deleted=true to all target messages in the MESSAGE_DELETE event
                    match: /MESSAGE_DELETE:function\((\w)\){var .+?((?:\w{1,2}\.){2})getOrCreate.+?},/,
                    replace: "MESSAGE_DELETE:function($1){$2commit($2getOrCreate($1.channelId).update($1.id,m=>m.set('deleted', true)))},"
                },
                // {
                //     // TODO: add MESSAGE_DELETE_BULK
                //     // Add deleted=true to all target messages in the MESSAGE_DELETE_BULK event
                //     match: /a/,
                //     replace: ""
                // },
                {
                    match: /(MESSAGE_UPDATE:function\((\w)\).+?)\.update\((\w)/,
                    replace: "$1" +
                        ".update($3,m=>$2.message.content!==m.editHistory?.[0]?.content ? m.set('editHistory',[...(m.editHistory || []), {timestamp:$2.message.edited_timestamp,content:m.content}]) : m)" +
                        ".update($3"
                }
            ]
        },

        {
            // Message domain model parser(?)
            // Module 451
            find: "isFirstMessageInForumPost=function",
            replacement: [
                {
                    match: /(\w)\.customRenderedContent=(\w)\.customRenderedContent;/,
                    replace: "$1.customRenderedContent = $2.customRenderedContent;" +
                        "$1.deleted = $2.deleted || false;" +
                        "$1.editHistory = $2.editHistory || [];"
                }
            ]
        },

        {
            // Updated message transformer(?)
            // Module 819525
            find: "THREAD_STARTER_MESSAGE?null===",
            replacement: [
                // {
                //     // DEBUG: Log the params of the target function to the patch below
                //     match: /function L\(e,t\){/,
                //     replace: "function L(e,t){console.log('pre-transform', e, t);"
                // },
                {
                    // Pass through editHistory & deleted to the "edited message" transformer
                    match: /interactionData:(\w)\.interactionData/,
                    replace: "interactionData:$1.interactionData," +
                        "deleted:$1.deleted," +
                        "editHistory:$1.editHistory"
                },
                // {
                //     // DEBUG: Log the params of the target function to the patch below
                //     match: /function R\(e\){/,
                //     replace: "function R(e){console.log('transform',arguments);"
                // },
                {
                    // Construct new edited message and add editHistory & deleted (ref above)
                    match: /(roleSubscriptionData:\w\.role_subscription_data)/,
                    replace: "$1," +
                        "deleted:arguments[1]?.deleted," +
                        "editHistory:arguments[1]?.editHistory"
                }
            ]
        },

        {
            // Base message component renderer
            // Module 876389
            find: "Message must not be a thread starter message",
            replacement: [
                {
                    // Write message.deleted to deleted var
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
            // Message content renderer
            // Module 43016
            find: "Messages.MESSAGE_EDITED,\")\"))))",
            replacement: [
                {
                    // Render editHistory in the deepest div for message content
                    match: /((\w)\.createElement\("div",{id.+?},)(null!=.+?)(\)}function)/,
                    // FIXME: absolute time not showing when hovering timestamp
                    replace: "$1[ (arguments[0].message.editHistory.length > 0 ? arguments[0].message.editHistory.map(edit=>$2.createElement('div',{className: 'messageLogger-edited'},[edit.content,$2.createElement('time',{datetime: edit.timestamp,className:'messageLogger-editedTimestamp'},'(edited)')])) : null), $3]$4"
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

        {
            // Message header controller(?)
            // Module 352297
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
        },

        {
            // MessageStore caching internals
            // Module 819525
            find: "e.getOrCreate=function(t)",
            replacement: [
                // {
                //     // DEBUG: log getOrCreate return values from MessageStore caching internals
                //     match: /getOrCreate=function(.+?)return/,
                //     replace: "getOrCreate=function$1console.log('getOrCreate',n);return"
                // }
            ]
        }
    ]
});
