/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Settings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Parser, UserStore } from "@webpack/common";

function addDeleteStyleClass() {
    if (Settings.plugins.MessageLogger.deleteStyle === "text") {
        document.body.classList.remove("messagelogger-red-overlay");
        document.body.classList.add("messagelogger-red-text");
    } else {
        document.body.classList.remove("messagelogger-red-text");
        document.body.classList.add("messagelogger-red-overlay");
    }
}

export default definePlugin({
    name: "MessageLogger",
    description: "Temporarily logs deleted and edited messages.",
    authors: [Devs.rushii, Devs.Ven],

    timestampModule: null as any,
    moment: null as Function | null,

    start() {
        this.moment = findByPropsLazy("relativeTimeRounding", "relativeTimeThreshold");
        this.timestampModule = findByPropsLazy("messageLogger_TimestampComponent");

        addDeleteStyleClass();
    },

    stop() {
        document.querySelectorAll(".messageLogger-deleted").forEach(e => e.remove());
        document.querySelectorAll(".messageLogger-edited").forEach(e => e.remove());
        document.body.classList.remove("messagelogger-red-overlay");
        document.body.classList.remove("messagelogger-red-text");
    },

    renderEdit(edit: { timestamp: any, content: string; }) {
        const Timestamp = this.timestampModule.messageLogger_TimestampComponent;
        return (
            <ErrorBoundary noop>
                <div className="messageLogger-edited">
                    {Parser.parse(edit.content)}
                    <Timestamp
                        timestamp={edit.timestamp}
                        isEdited={true}
                        isInline={false}
                    >
                        <span>{" "}(edited)</span>
                    </Timestamp>
                </div>
            </ErrorBoundary>
        );
    },

    makeEdit(newMessage: any, oldMessage: any): any {
        return {
            timestamp: this.moment?.call(newMessage.edited_timestamp),
            content: oldMessage.content
        };
    },

    options: {
        deleteStyle: {
            type: OptionType.SELECT,
            description: "The style of deleted messages",
            default: "text",
            options: [
                { label: "Red text", value: "text", default: true },
                { label: "Red overlay", value: "overlay" }
            ],
            onChange: () => addDeleteStyleClass()
        },
        ignoreBots: {
            type: OptionType.BOOLEAN,
            description: "Whether to ignore messages by bots",
            default: false
        },
        ignoreSelf: {
            type: OptionType.BOOLEAN,
            description: "Whether to ignore messages by yourself",
            default: false
        }
    },

    handleDelete(cache: any, data: { ids: string[], id: string; }, isBulk: boolean) {
        try {
            if (cache == null || (!isBulk && !cache.has(data.id))) return cache;

            const { ignoreBots, ignoreSelf } = Settings.plugins.MessageLogger;
            const myId = UserStore.getCurrentUser().id;

            function mutate(id: string) {
                const msg = cache.get(id);
                if (!msg) return;

                const EPHEMERAL = 64;
                const shouldIgnore = (msg.flags & EPHEMERAL) === EPHEMERAL ||
                    ignoreBots && msg.author?.bot ||
                    ignoreSelf && msg.author?.id === myId;

                if (shouldIgnore) {
                    cache = cache.remove(id);
                } else {
                    cache = cache.update(id, m => m
                        .set("deleted", true)
                        .set("attachments", m.attachments.map(a => (a.deleted = true, a))));
                }
            }

            if (isBulk) {
                data.ids.forEach(mutate);
            } else {
                mutate(data.id);
            }
        } catch (e) {
            new Logger("MessageLogger").error("Error during handleDelete", e);
        }
        return cache;
    },

    // Based on canary 9ab8626bcebceaea6da570b9c586172d02b9c996
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
                        "   cache = Vencord.Plugins.plugins.MessageLogger.handleDelete(cache, $1, false);" +
                        "   $2commit(cache);" +
                        "},"
                },
                {
                    // Add deleted=true to all target messages in the MESSAGE_DELETE_BULK event
                    match: /MESSAGE_DELETE_BULK:function\((\w)\){var .+?((?:\w{1,2}\.){2})getOrCreate.+?},/,
                    replace:
                        "MESSAGE_DELETE_BULK:function($1){" +
                        "   var cache = $2getOrCreate($1.channelId);" +
                        "   cache = Vencord.Plugins.plugins.MessageLogger.handleDelete(cache, $1, true);" +
                        "   $2commit(cache);" +
                        "},"
                },
                {
                    // Add current cached content + new edit time to cached message's editHistory
                    match: /(MESSAGE_UPDATE:function\((\w)\).+?)\.update\((\w)/,
                    replace: "$1" +
                        ".update($3,m =>" +
                        "   $2.message.content !== m.editHistory?.[0]?.content && $2.message.content !== m.content ?" +
                        "       m.set('editHistory',[...(m.editHistory || []), Vencord.Plugins.plugins.MessageLogger.makeEdit($2.message, m)]) :" +
                        "       m" +
                        ")" +
                        ".update($3"
                }
            ]
        },

        {
            // Message domain model
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
                //     match: /function N\(e,t\){/,
                //     replace: "function L(e,t){console.log('pre-transform', e, t);"
                // },
                {
                    // Pass through editHistory & deleted & original attachments to the "edited message" transformer
                    match: /interactionData:(\w)\.interactionData/,
                    replace:
                        "interactionData:$1.interactionData," +
                        "deleted:$1.deleted," +
                        "editHistory:$1.editHistory," +
                        "attachments:$1.attachments"
                },

                // {
                //     // DEBUG: Log the params of the target function to the patch below
                //     match: /function R\(e\){/,
                //     replace: "function R(e){console.log('after-edit-transform', arguments);"
                // },
                {
                    // Construct new edited message and add editHistory & deleted (ref above)
                    // Pass in custom data to attachment parser to mark attachments deleted as well
                    match: /attachments:(\w{1,2})\((\w)\)/,
                    replace:
                        "attachments: $1((() => {" +
                        "   let old = arguments[1]?.attachments;" +
                        "   if (!old) return $2;" +
                        "   let new_ = $2.attachments?.map(a => a.id) ?? [];" +
                        "   let diff = old.filter(a => !new_.includes(a.id));" +
                        "   old.forEach(a => a.deleted = true);" +
                        "   $2.attachments = [...diff, ...$2.attachments];" +
                        "   return $2;" +
                        "})())," +
                        "deleted: arguments[1]?.deleted," +
                        "editHistory: arguments[1]?.editHistory"
                },
                {
                    // Preserve deleted attribute on attachments
                    match: /(\((\w)\){return null==\2\.attachments.+?)spoiler:/,
                    replace:
                        "$1deleted: arguments[0]?.deleted," +
                        "spoiler:"
                }
            ]
        },

        {
            // Attachment renderer
            // Module 96063
            find: "[\"className\",\"attachment\",\"inlineMedia\"]",
            replacement: [
                {
                    match: /((\w)\.className,\w=\2\.attachment),/,
                    replace: "$1,deleted=$2.attachment?.deleted,"
                },
                {
                    match: /(hiddenSpoilers:\w,className:)/,
                    replace: "$1 (deleted ? 'messageLogger-deleted-attachment ' : '') +"
                }
            ]
        },

        {
            // Base message component renderer
            // Module 748241
            find: "Message must not be a thread starter message",
            replacement: [
                {
                    // Write message.deleted to deleted var
                    match: /var (\w)=(\w).id,(?=\w=\w.message)/,
                    replace: "var $1=$2.id,deleted=$2.message.deleted,"
                },
                {
                    // Append messageLogger-deleted to classNames if deleted
                    match: /\)\("li",\{(.+?),className:/,
                    replace: ")(\"li\",{$1,className:(deleted ? \"messageLogger-deleted \" : \"\")+"
                }
            ]
        },

        {
            // Message content renderer
            // Module 43016
            find: "Messages.MESSAGE_EDITED,\")\"",
            replacement: [
                {
                    // Render editHistory in the deepest div for message content
                    match: /(\)\("div",\{id:.+?children:\[)/,
                    replace: "$1 (arguments[0].message.editHistory.length > 0 ? arguments[0].message.editHistory.map(edit => Vencord.Plugins.plugins.MessageLogger.renderEdit(edit)) : null), "
                }
            ]
        },

        {
            // ReferencedMessageStore
            // Module 778667
            find: "displayName=\"ReferencedMessageStore\"",
            replacement: [
                {
                    match: /MESSAGE_DELETE:function\((\w)\).+?},/,
                    replace: "MESSAGE_DELETE:function($1){},"
                },
                {
                    match: /MESSAGE_DELETE_BULK:function\((\w)\).+?},/,
                    replace: "MESSAGE_DELETE_BULK:function($1){},"
                }
            ]
        },

        {
            // Message "(edited)" timestamp component
            // Module 23552
            find: "Messages.MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL.format",
            replacement: {
                // Re-export the timestamp component under a findable name
                match: /{(\w{1,2}:\(\)=>(\w{1,2}))}/,
                replace: "{$1,messageLogger_TimestampComponent:()=>$2}"
            }
        },

        {
            // Message context base menu
            // Module 600300
            find: "id:\"remove-reactions\"",
            replacement: [
                {
                    // Remove the first section if message is deleted
                    match: /children:(\[""===.+?\])/,
                    replace: "children:arguments[0].message.deleted?[]:$1"
                }
            ]
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
});
