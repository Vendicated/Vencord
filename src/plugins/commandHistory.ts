/* eslint-disable simple-header/header */
/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ComponentDispatch, MessageStore, SelectedChannelStore, UserStore } from "@webpack/common";

function getUserMessages() {
    const userId = UserStore.getCurrentUser().id;
    const channelId = SelectedChannelStore.getChannelId();
    var allMessages: Array<any> = MessageStore.getMessages(channelId).toArray();
    var messages = allMessages.reverse().filter(function (msg) {
        // NOTE: doesn't work for application commmands as discord seems to forget how to recreate them on reload :(
        return /* msg.interaction != null ? msg.interaction.user.id === userId : */ msg.author.id === userId;
    });
    console.log("user's messages currently loaded: " + messages.length);
    return messages;
}
function replaceTextInChatInputBox(text) {
    ComponentDispatch.dispatchToLastSubscribed("CLEAR_TEXT");
    setTimeout(function () {
        ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
            rawText: text
        }); // NOTE: this function has to wait because the dispatching fails occasionally when done immediately in succession ... idk why (but it seems to be a discord issue)
    }, 1); // however this does mean that there is a slight flicker when the command changes which is unfortunate :/
}
var commandHistoryPositions: Map<string, number> = new Map();

export default definePlugin({
    name: "CommandHistory",
    description: "Use Shift+Up/Down to cycle through previously sent messages like in a terminal",
    authors: [Devs.Hexo],
    patches: [
        {
            find: ".handleEditLastMessage",
            replacement: { // intercept up arrow functionality and add down arrow functionality
                match: /(?<start>.handleKeyDown=function\((?<param>\i)\).{1,200}(?<keyboardModeEnabled>\i)=.+?\.keyboardModeEnabled.{1,100}(?<modifierKey>\i)=\i\..{3,5}Key.{1,100}(?<nonEmpty>\i)=0!=.{1,200}case (?<keyType>\i.\i)\.ARROW_UP:.{0,100})if\(\k<modifierKey>\)return;(?<betweenreturns>.{0,100}?)if\(\k<nonEmpty>\)return;(?<afterreturns>.{1,100}?if\(\k<keyboardModeEnabled>\))(?<keyboardModeBlock>.{1,300}?)else{(?<originalBlock>.{1,600}?=(?<context>\i.\i).getLastCommandMessage.{1,600}?)}return;case/,
                replace: "$<start>var normal_functionality=$self.normal_functionality($<param>.ctrlKey, $<param>.shiftKey);if($<param>.altKey||$<param>.metaKey||$self.return_early($<param>.ctrlKey, $<param>.shiftKey)||(normal_functionality&&$<nonEmpty>))return;$<betweenreturns>$<afterreturns>{if(normal_functionality)return;$<keyboardModeBlock>}else{if(normal_functionality){$<param>.ctrlKey=false;$<param>.shiftKey=false;$<originalBlock>}else{" +
                    "$self.press_up();" +
                    "}}return;case $<keyType>.ARROW_DOWN:var normal_functionality=$self.normal_functionality($<param>.ctrlKey, $<param>.shiftKey);if($<param>.altKey||$<param>.metaKey||$self.return_early($<param>.ctrlKey, $<param>.shiftKey)||normal_functionality)return;" +
                    "$self.press_down();" +
                    "return;case"
            }
        }
    ],
    start() {
        this.listener = addPreSendListener(channelId => {
            commandHistoryPositions.delete(channelId); // reset position
        });
    },
    stop() {
        removePreSendListener(this.listener);
    },
    press_up: function () {
        const channelId = SelectedChannelStore.getChannelId();
        var messages = getUserMessages();

        var current = commandHistoryPositions.get(channelId);
        if (current === undefined)
            current = 0;
        else if (current === messages.length - 1)
            return; // cannot increase further, no need to clear the text
        else
            current = Math.min(current + 1, messages.length - 1);
        commandHistoryPositions.set(channelId, current);

        replaceTextInChatInputBox(messages[current].content);
    },
    press_down: function () {
        const channelId = SelectedChannelStore.getChannelId();
        var messages = getUserMessages();

        var current = commandHistoryPositions.get(channelId);
        if (current === undefined || current === -1) return; // cannot decrease further, no need to clear the text
        current = Math.min(Math.max(current - 1, -1), messages.length - 1);
        commandHistoryPositions.set(channelId, current);

        if (current >= 0)
            replaceTextInChatInputBox(messages[current].content);
        else
            ComponentDispatch.dispatchToLastSubscribed("CLEAR_TEXT");
    },
    normal_functionality: function (ctrlKey, shiftKey) {
        return Settings.plugins.CommandHistory.invertModifierUsage
            === (
                Settings.plugins.CommandHistory.modifierKey === "shift" ? shiftKey :
                    Settings.plugins.CommandHistory.modifierKey === "ctrl" ? ctrlKey :
                        Settings.plugins.CommandHistory.invertModifierUsage // so always uses normal functionality should the setting be wrong somehow
            );
    },
    return_early: function (ctrlKey, shiftKey) {
        return (Settings.plugins.CommandHistory.modifierKey === "shift" && ctrlKey)
            || (Settings.plugins.CommandHistory.modifierKey === "ctrl" && shiftKey);
    },

    settings: definePluginSettings({
        invertModifierUsage: {
            type: OptionType.BOOLEAN,
            description: "Whether to use Up/Down to cycle through message history instead, leaving [modifierKey]-Up/Down for normal functionality",
            default: false
        },
        modifierKey: {
            type: OptionType.SELECT,
            description: "Which modifier key is used",
            default: "shift",
            options: [
                { label: "Shift", value: "shift", default: true },
                { label: "Control", value: "ctrl" }
            ],
            restartNeeded: true
        },
    }),
});
