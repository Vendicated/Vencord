import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components/SettingSliderComponent";
import { Devs } from "@utils/constants";
import { sleep } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore, SelectedChannelStore, UserStore } from "@webpack/common";
import { Message, ReactionEmoji } from "discord-types/general";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

interface IReactionAdd {
    type: "MESSAGE_REACTION_ADD";
    optimistic: boolean;
    channelId: string;
    messageId: string;
    messageAuthorId: string;
    userId: string;
    emoji: ReactionEmoji;
}

interface IVoiceChannelEffectSendEvent {
    type: string;
    emoji?: ReactionEmoji;
    channelId: string;
    userId: string;
    animationType: number;
    animationId: number;
}

const CaseOh = "🎡";
const CaseOH_URL =
    "https://scarlot.needs.rest/r/caseoh-ferris.mp3";

const settings = definePluginSettings({
    volume: {
        description: "Volume of CaseOh",
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 0.5,
        stickToMarkers: false
    },
    triggerWhenUnfocused: {
        description: "Should trigger the sound even when the window is unfocused",
        type: OptionType.BOOLEAN,
        default: true
    },
    ignoreBots: {
        description: "Should ignore bots",
        type: OptionType.BOOLEAN,
        default: true
    },
    ignoreBlocked: {
        description: "Should ignore blocked users",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "CaseOh",
    authors: [Devs.Scarlot],
    description: "🎡🎡 CaseOh",
    settings,

    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (settings.store.ignoreBots && message.author?.bot) return;
            if (settings.store.ignoreBlocked && RelationshipStore.isBlocked(message.author?.id)) return;
            if (!message.content) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const moyaiCount = CaseOHCount(message.content);

            for (let i = 0; i < moyaiCount; i++) {
                playSound();
                await sleep(300);
            }
        },

        MESSAGE_REACTION_ADD({ optimistic, type, channelId, userId, messageAuthorId, emoji }: IReactionAdd) {
            if (optimistic || type !== "MESSAGE_REACTION_ADD") return;
            if (settings.store.ignoreBots && UserStore.getUser(userId)?.bot) return;
            if (settings.store.ignoreBlocked && RelationshipStore.isBlocked(messageAuthorId)) return;

            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const name = emoji.name.toLowerCase();
            if (name !== CaseOh && !name.includes("ferris")) return;

            playSound();
        },

        VOICE_CHANNEL_EFFECT_SEND({ emoji }: IVoiceChannelEffectSendEvent) {
            if (!emoji?.name) return;

            const name = emoji.name.toLowerCase();

            if (name !== CaseOh && !name.includes("ferris")) return;

            playSound();
        }
    }
});


function CaseOHCount(message: string) {
    let i = 0;
    let lastIndex = 0;

    while ((lastIndex = message.indexOf(CaseOh, lastIndex) + 1) !== 0) i++;

    return Math.min(i, 10);
}

function playSound() {
    if (!settings.store.triggerWhenUnfocused && !document.hasFocus()) return;

    const audioElement = document.createElement("audio");

    audioElement.src = CaseOH_URL;

    audioElement.volume = settings.store.volume;
    audioElement.play();
}
