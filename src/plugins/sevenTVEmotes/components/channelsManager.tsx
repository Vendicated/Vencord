/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { DeleteIcon } from "@components/Icons";
import { load7TVChannels } from "@plugins/sevenTVEmotes/api/api";
import { settings } from "@plugins/sevenTVEmotes/utils/settings";
import { React, TextInput, useEffect, useMemo, useState } from "@webpack/common";

function parseChannels(raw: string) {
    return raw
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
}

function serializeChannels(channels: string[]) {
    return channels.join(", ");
}

function buildAvatarByIndex(channels: Awaited<ReturnType<typeof load7TVChannels>>) {
    const byIndex = new Map<number, string>();

    for (const channel of channels) {
        const index = Number(channel.key.split(":").at(-1));
        if (Number.isNaN(index) || !channel.avatarUrl) continue;
        byIndex.set(index, channel.avatarUrl);
    }

    return byIndex;
}

export function SettingsChannelsManager() {
    const { channels } = settings.use(["channels"]);
    const configuredChannels = useMemo(() => parseChannels(channels), [channels]);

    const [input, setInput] = useState("");
    const [avatarByIndex, setAvatarByIndex] = useState<Map<number, string>>(new Map());

    useEffect(() => {
        let alive = true;

        if (configuredChannels.length === 0) {
            setAvatarByIndex(new Map());
            return;
        }

        load7TVChannels(configuredChannels).then(list => {
            if (!alive) return;
            setAvatarByIndex(buildAvatarByIndex(list));
        });

        return () => { alive = false; };
    }, [channels]);

    const addChannel = () => {
        const value = input.trim();
        if (!value) return;

        const lower = value.toLowerCase();
        if (configuredChannels.some(ch => ch.toLowerCase() === lower)) {
            setInput("");
            return;
        }

        settings.store.channels = serializeChannels([...configuredChannels, value]);
        setInput("");
    };

    const removeChannel = (index: number) => {
        settings.store.channels = serializeChannels(configuredChannels.filter((_, i) => i !== index));
    };

    return (
        <div className="vc-7tv-settings-root">
            <div className="vc-7tv-settings-row">
                <TextInput
                    placeholder="7TV username or user ID"
                    value={input}
                    onChange={setInput}
                    onKeyDown={event => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            addChannel();
                        }
                    }}
                />
                <Button onClick={addChannel} disabled={!input.trim()}>
                    Add
                </Button>
            </div>

            <div className="vc-7tv-settings-list">
                {configuredChannels.length === 0 && (
                    <div className="vc-7tv-settings-empty">No channels added yet.</div>
                )}

                {configuredChannels.map((channel, index) => (
                    <div key={`${channel}:${index}`} className="vc-7tv-settings-item">
                        {avatarByIndex.get(index)
                            ? (
                                <img
                                    src={avatarByIndex.get(index)}
                                    alt={channel}
                                    className="vc-7tv-settings-avatar"
                                    loading="lazy"
                                />
                            )
                            : (
                                <div className="vc-7tv-settings-avatar vc-7tv-settings-avatar-fallback">
                                    {channel.slice(0, 2).toUpperCase()}
                                </div>
                            )}

                        <span className="vc-7tv-settings-channel-name">{channel}</span>

                        <Button
                            variant="dangerSecondary"
                            size="iconOnly"
                            onClick={() => removeChannel(index)}
                        >
                            <DeleteIcon aria-label="Remove channel" width={16} height={16} />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
