/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs, EquicordDevs } from "@utils/constants";
import { sleep } from "@utils/misc";
import definePlugin from "@utils/types";
import { RelationshipStore, SelectedChannelStore, UserStore } from "@webpack/common";

import { croissant } from "./equissant";
import { boom, getMoyaiCount, MOYAI } from "./moyai";
import { settings } from "./settings";
import { IMessageCreate, IReactionAdd, IVoiceChannelEffectSendEvent } from "./types";
import { generateAnimalese, playSound, init, kill } from "./animalese";
import { keydown } from "./keyboardSounds";
import { Settings } from "@api/Settings";

export let click1, click2, click3, backspace;
export let sounds = {
    click1,
    click2,
    click3,
    backspace
};

export default definePlugin({
    name: "SoundTroll",
    description: "Random sound plugin",
    authors: [EquicordDevs.SomeAspy, Devs.thororen, Devs.Megu, Devs.Nuckyz, EquicordDevs.ryanamay, EquicordDevs.Mocha, Devs.HypedDomi],
    settings,
    start() {
        if (settings.store.equissant) {
            document.addEventListener("click", croissant);
        }
        if (settings.store.animalese) {
            init();
        }
        if (settings.store.keyboardSounds) {
            click1 = new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/click1.wav");
            click2 = new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/click2.wav");
            click3 = new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/click3.wav");
            backspace = new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/backspace.wav");
            sounds = {
                click1,
                click2,
                click3,
                backspace,
            };
            document.addEventListener("keydown", keydown);
        }
        if (Settings.plugins?.Animalese?.enabled) {
            Settings.plugins.Animalese.enabled = false;
            Settings.plugins.SoundTroll.enabled = true;
            settings.store.animalese = true;
        }
        if (Settings.plugins?.Moyai?.enabled) {
            Settings.plugins.Moyai.enabled = false;
            Settings.plugins.SoundTroll.enabled = true;
            settings.store.moyai = true;
        }
        if (Settings.plugins?.Equissant?.enabled) {
            Settings.plugins.Equissant.enabled = false;
            Settings.plugins.SoundTroll.enabled = true;
            settings.store.equissant = true;
        }
        if (Settings.plugins?.KeyboardSounds?.enabled) {
            Settings.plugins.KeyboardSounds.enabled = false;
            Settings.plugins.SoundTroll.enabled = true;
            settings.store.keyboardSounds = true;
        }
    },
    stop() {
        if (settings.store.equissant) {
            document.removeEventListener("click", croissant);
        }
        if (settings.store.animalese) {
            kill();
        }
        if (settings.store.keyboardSounds) {
            document.removeEventListener("keydown", keydown);
        }
    },
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (settings.store.ignoreBots && message.author?.bot) return;
            if (settings.store.ignoreBlocked && RelationshipStore.isBlocked(message.author?.id)) return;
            if (!message.content) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            if (settings.store.moyai) {
                const moyaiCount = getMoyaiCount(message.content);

                for (let i = 0; i < moyaiCount; i++) {
                    boom();
                    await sleep(300);
                }
            }

            if (settings.store.animalese) {
                const urlPattern = /https?:\/\/[^\s]+/;
                const maxLength = settings.store.messageLengthLimit || 100;
                const processOwnMessages = settings.store.processOwnMessages ?? true;
                if (
                    urlPattern.test(message.content)
                    || message.content.length > maxLength
                    || !processOwnMessages
                    && String(message.author.id) === String(UserStore.getCurrentUser().id)
                ) return;

                try {
                    const buffer = await generateAnimalese(message.content);
                    if (buffer) await playSound(buffer, settings.store.volume);
                } catch (err) {
                    console.error("[Animalese]", err);
                }
            }
        },

        MESSAGE_REACTION_ADD({ optimistic, type, channelId, userId, messageAuthorId, emoji }: IReactionAdd) {
            if (optimistic || type !== "MESSAGE_REACTION_ADD") return;
            if (settings.store.ignoreBots && UserStore.getUser(userId)?.bot) return;
            if (settings.store.ignoreBlocked && RelationshipStore.isBlocked(messageAuthorId)) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            if (settings.store.moyai) {
                const name = emoji.name.toLowerCase();
                if (name !== MOYAI && !name.includes("moyai") && !name.includes("moai")) return;

                boom();
            }
        },

        VOICE_CHANNEL_EFFECT_SEND({ emoji }: IVoiceChannelEffectSendEvent) {
            if (settings.store.moyai) {
                if (!emoji?.name) return;
                const name = emoji.name.toLowerCase();
                if (name !== MOYAI && !name.includes("moyai") && !name.includes("moai")) return;

                boom();
            }
        }
    }
});
