import { Devs } from "../../utils/constants";
import definePlugin, { PluginDef } from "../../utils/types";
import { React } from "../../webpack/common";
import { lazyWebpack } from "../../utils/misc";
import { filters } from "../../webpack";
import css from "./index.css";

interface MessageLoggerDef extends PluginDef {
    timestampModule: any;
    momentJsModule: any;
}

export default definePlugin({
    name: "MessageLogger",
    description: "Temporarily logs deleted and edited messages.",
    authors: [Devs.rushii],
    css: css,

    timestampModule: null,
    momentJsModule: null,

    start() {
        // FIXME: for some reason proxy doesn't execute in lazy
        this.momentJsModule = Vencord.Webpack.findByProps("relativeTimeRounding", "relativeTimeThreshold");
        this.timestampModule = lazyWebpack(filters.byProps(["messageLogger_TimestampComponent"]));
    },

    renderEdit(edit: { timestamp: any, content: string }): any {
        return React.createElement("div", { className: "messageLogger-edited" }, [
            edit.content,
            React.createElement(this.timestampModule.messageLogger_TimestampComponent, {
                timestamp: edit.timestamp,
                isEdited: true,
                isInline: false
            }, [
                React.createElement("span", {}, " (edited)")
            ])
        ]);
    },

    makeEdit(newMessage: any, oldMessage: any): any {
        return {
            timestamp: this.momentJsModule(newMessage.edited_timestamp),
            content: oldMessage.content
        };
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
                    replace:
                        "MESSAGE_DELETE:function($1){" +
                        "   var cache = $2getOrCreate($1.channelId);" +
                        "   cache = cache.update($1.id,m=>m.set('deleted', true));" +
                        "   $2commit(cache);" +
                        "},"
                },
                {
                    // Add deleted=true to all target messages in the MESSAGE_DELETE_BULK event
                    match: /MESSAGE_DELETE_BULK:function\((\w)\){var .+?((?:\w{1,2}\.){2})getOrCreate.+?},/,
                    replace:
                        "MESSAGE_DELETE_BULK:function($1){" +
                        "   var cache = $2getOrCreate($1.channelId);" +
                        "   cache = $1.ids.reduce((pv,cv) => pv.update(cv, msg => msg.set('deleted', true)), cache);" +
                        "   $2commit(cache);" +
                        "},"
                },
                {
                    // Add current cached content + new edit time to cached message's editHistory
                    match: /(MESSAGE_UPDATE:function\((\w)\).+?)\.update\((\w)/,
                    replace: "$1" +
                        ".update($3,m => $2.message.content!==m.editHistory?.[0]?.content ? m.set('editHistory',[...(m.editHistory || []), Vencord.Plugins.plugins.MessageLogger.makeEdit($2.message, m)]) : m)" +
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
                    replace: "$1[ (arguments[0].message.editHistory.length > 0 ? arguments[0].message.editHistory.map(edit => Vencord.Plugins.plugins.MessageLogger.renderEdit(edit)) : null), $3]$4"
                }
            ]
        },

        {
            // ReferencedMessageStore
            // Module 778667
            find: "displayName=\"ReferencedMessageStore\"",
            replacement: [
                {
                    match: /MESSAGE_DELETE:function.+?},/,
                    replace: "MESSAGE_DELETE:function(){},"
                },
                {
                    match: /MESSAGE_DELETE_BULK:function.+?},/,
                    replace: "MESSAGE_DELETE_BULK:function(){},"
                }
            ]
        },

        {
            // Message "(edited)" timestamp component
            find: "Messages.MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL.format",
            replacement: {
                // Mark the timestamp component clearly so that it won't
                match: /{(\w{1,2}:\(\)=>(\w{1,2}))}/,
                replace: "{$1,messageLogger_TimestampComponent:()=>$2}"
            }
        }

        // {
        //     // MessageStore caching internals
        //     // Module 819525
        //     find: "e.getOrCreate=function(t)",
        //     replacement: [
        //         // {
        //         //     // DEBUG: log getOrCreate return values from MessageStore caching internals
        //         //     match: /getOrCreate=function(.+?)return/,
        //         //     replace: "getOrCreate=function$1console.log('getOrCreate',n);return"
        //         // }
        //     ]
        // }
    ]
} as MessageLoggerDef);
