import definePlugin, { OptionType } from "@utils/types";
import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { MessageJSON } from "discord-types/general";

// o: has ._channelMessages and .commit()
// o is ChannelMessages
// o is h class
// foreach iterates through _messages
// D is RelationshipStore?

// o.default.forEach(e=>{o.default.commit(e.reset(e.map(e=>e.set('blocked',$self.containsBlockedKeywords($1)))))})

export default definePlugin({
    name: "BlockKeywords",
    description: "Blocks messages containing specific user-defined keywords, as if the user sending them was blocked.",
    authors: [Devs.catcraft],
    patches: [
        /*
        {
            // alternative find string: "d.getPrivateChannelIntegrationRemovedSystemMessageASTContent)({"
            find: '.MessageTypes.PRIVATE_CHANNEL_INTEGRATION_ADDED)return(',
            replacement: {
                match: /default\.isBlocked\((.{1,2})\.author.id\)/g,
                replace: "$&||$self.containsBlockedKeywords($1)"
            }
        },
        {
            find: 'displayName="MessageStore"',
            replacement: {
                match: /default\.isBlocked\((.{1,2})\.author.id\)/g,
                replace: "$&||$self.containsBlockedKeywords($1)"
            }
        },
        {
            find: 'displayName="ReadStateStore"',
            replacement: {
                match: /default\.isBlocked\((.{1,2})\.author.id\)/g,
                replace: "$&||$self.containsBlockedKeywords($1)"
            }
        },
        {
            find: 'default.Messages.NEW_MESSAGES_ESTIMATED_SUMMARIES):(',
            replacement: {
                match: /default\.isBlocked\((.{1,2})\.author.id\)/g,
                replace: "$&||$self.containsBlockedKeywords($1)"
            }
        },
        {
            find: '.default.Messages.BLOCKED_MESSAGE_COUNT:(',
            replacement: {
                match: /default\.isBlocked\((.{1,2})\.author.id\)/g,
                replace: "$&||$self.containsBlockedKeywords($1)"
            }
        },
        {
            find: '.displayName="ChannelPinsStore"',
            replacement: {
                match: /default\.isBlocked\((.{1,2})\.author.id\)/g,
                replace: "$&||$self.containsBlockedKeywords($1)"
            }
        },
        {
            // alternative find string: "()},MESSAGE_CREATE:function"
            // replace arg with arg.set('blocked', $self.containsBlockedKeywords(arg))
            find: 'LOAD_MESSAGE_INTERACTION_DATA_SUCCESS:function',
            replacement: {
                match: /(\)\),.{0,2}\.default\.commit\()(.{0,2})(\)\},MESSAGE_SEND_FAILED:function)/g,
                replace: "$1$self.blockMessagesWithKeywords($2)$3"
            }
        },
        */
        {
            find: '.default("ChannelMessages")',
            replacement: {
                match: /static commit\((.{1,2})\){/g,
                replace: "$&$1=$self.blockMessagesWithKeywords($1);"
            }
        },
    ],

    options: {
        blockedWords: {
            type: OptionType.STRING,
            description: "Comma-seperated list of words to block.",
            default: ""
        }
    },

    containsBlockedKeywords(message: MessageJSON) {
        if (!Settings.plugins.BlockKeywords.blockedWords) { return false; }
        const blockedWordsList: Array<string> = Settings.plugins.BlockKeywords.blockedWords.split(",");

        // can't use blockedWordsList.forEach because we need to return from inside the loop
        for (let wordIndex = 0; wordIndex < blockedWordsList.length; wordIndex++) {
            if (message.content.includes(blockedWordsList[wordIndex])) {
                return true;
            }
        }

        return false;
    },

    blockMessagesWithKeywords(messageList: any) {
        return messageList.reset(messageList.map(
            message => message.set('blocked', this.containsBlockedKeywords(message))
        ));
    }
});
