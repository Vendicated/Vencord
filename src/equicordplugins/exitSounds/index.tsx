/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { playAudio } from "@api/AudioPlayer";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { ChannelActions, Constants, GuildStore, IconUtils, MediaEngineStore, Menu, RestAPI, SearchableSelect, SelectedChannelStore, TextInput, Toasts } from "@webpack/common";

const cl = classNameFactory("vc-exitsounds-");

const PlayIcon = findComponentByCodeLazy("4.96v14.08c0");

function GuildSelector() {
    const { soundGuildId } = settings.use(["soundGuildId"]);
    const options = Object.values(GuildStore.getGuilds()).map(g => ({
        value: g.id,
        label: g.name
    }));

    return (
        <SearchableSelect
            options={options}
            value={options.find(o => o.value === soundGuildId)}
            placeholder="Select a server..."
            maxVisibleItems={6}
            closeOnSelect={true}
            onChange={v => settings.store.soundGuildId = v}
            renderOptionPrefix={o => {
                const guild = GuildStore.getGuild(o?.value);
                if (!guild?.icon) return null;
                return (
                    <img
                        className={cl("guild-icon")}
                        src={IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 32 })!}
                    />
                );
            }}
        />
    );
}

function SoundIdInput() {
    const { soundId } = settings.use(["soundId"]);

    return (
        <div className={cl("input-row")}>
            <div className={cl("input-wrapper")}>
                <TextInput
                    value={soundId}
                    onChange={v => settings.store.soundId = v}
                    placeholder="Enter sound ID..."
                />
            </div>
            <Button
                onClick={() => playAudio(`https://${window.GLOBAL_ENV.CDN_HOST}/soundboard-sounds/${soundId}`, { volume: 50 })}
                disabled={!soundId}
            >
                <PlayIcon color="currentColor" />
            </Button>
        </div>
    );
}

const settings = definePluginSettings({
    soundGuildId: {
        type: OptionType.COMPONENT,
        description: "Select the server containing the sound.",
        component: GuildSelector
    },
    soundId: {
        type: OptionType.COMPONENT,
        description: "Enter the ID of the sound you want to play.",
        component: SoundIdInput
    }
});

const SoundButtonContext: NavContextMenuPatchCallback = (children, { sound }: { sound: { soundId: string; guildId: string; }; }) => {
    children.splice(1, 0,
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="set-global-exit-sound"
                label="Set as global exit sound"
                action={() => {
                    settings.store.soundGuildId = sound.guildId;
                    settings.store.soundId = sound.soundId;
                }}
            />
        </Menu.MenuGroup>
    );
};

let original: typeof ChannelActions.selectVoiceChannel;

export default definePlugin({
    name: "ExitSounds",
    description: "Play soundboard sounds when you disconnect from voice.",
    authors: [EquicordDevs.Prism],
    dependencies: ["AudioPlayerAPI"],
    settings,

    contextMenus: {
        "sound-button-context": SoundButtonContext
    },

    start() {
        original = ChannelActions.selectVoiceChannel;
        ChannelActions.selectVoiceChannel = async (id: string | null, ...args: unknown[]) => {
            const { soundGuildId, soundId } = settings.store;
            const voiceId = SelectedChannelStore.getVoiceChannelId();

            if (soundGuildId && soundId && voiceId !== id && !MediaEngineStore.isDeaf()) {
                try {
                    await RestAPI.post({
                        url: Constants.Endpoints.SEND_SOUNDBOARD_SOUND(voiceId),
                        body: {
                            sound_id: soundId,
                            source_guild_id: soundGuildId
                        }
                    });
                    await new Promise(r => setTimeout(r, 500));
                } catch {
                    Toasts.show({
                        message: "Oops! Something went wrong.",
                        id: Toasts.genId(),
                        type: Toasts.Type.FAILURE
                    });
                }
            }

            return original(id, ...args);
        };
    },

    stop() {
        ChannelActions.selectVoiceChannel = original;
    }
});
