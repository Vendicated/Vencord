/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { PlusIcon } from "@components/Icons";
import { PluginOptionArray } from "@utils/types";
import { Channel, Guild, SelectOption } from "@vencord/discord-types";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import {
    Avatar,
    Button,
    ChannelStore,
    Flex,
    GuildStore,
    IconUtils,
    React,
    SearchableSelect,
    TextInput, useEffect, UserStore,
    useState,
} from "@webpack/common";

import { SettingProps, SettingsSection } from "./Common";

const getDMChannelIcon = findByCodeLazy(".getChannelIconURL({");
const GroupDMAvatars = findComponentByCodeLazy(".AvatarSizeSpecs[", "getAvatarURL");
const getChannelSymbol = findByCodeLazy(".isModeratorReportChannel", "GUILD_ANNOUNCEMENT");

const isDevModeEnabled = () => getUserSettingLazy("appearance", "developerMode")?.getSetting() === true;

export const ChannelSetting = ErrorBoundary.wrap(function ChannelSetting({
    option,
    pluginSettings,
    definedSettings,
    onChange,
    id
}: SettingProps<PluginOptionArray>) {
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<string[]>(ensureSettingsMigrated() || []);
    const [text, setText] = useState<string>("");
    const [guild, setGuild] = useState<string>();

    useEffect(() => {
        pluginSettings[id] = items;
        onChange(items);
    }, [items]);

    useEffect(() => {
        if (text === "") {
            setError(null);
            return;
        }

        if (items.includes(text)) {
            setError("This item is already added");
            return;
        }

        if (text.length >= 18 && text.length <= 19 && !isNaN(Number(text))) {
            setError(null);
        } else {
            setError("Invalid ID");
        }
    }, [text, items]);

    // TODO: remove this after a few months
    function ensureSettingsMigrated(): string[] | undefined {
        // TODO maybe move this to @api/Settings where migratePluginSettings is?
        // in case the settings get manually overridden without a restart of Vencord itself this will prevent crashing
        if (pluginSettings[id] == null || Array.isArray(pluginSettings[id])) {
            return pluginSettings[id];
        }
        const sep = option.oldStringSeparator || ",";
        let migrated: string[];
        if (typeof sep === "string" || sep instanceof RegExp) {
            migrated = pluginSettings[id]?.split(sep);
        } else if (typeof sep === "function") {
            migrated = sep(pluginSettings[id]);
        } else {
            throw new Error(`Invalid oldStringSeparator for in setting ${id} for plugin ${definedSettings?.pluginName || "Unknown plugin"}`);
        }
        onChange(migrated);
        return migrated;
    }

    const guildIcon = (guild: Guild) => {
        const icon = guild?.icon == null ? undefined : IconUtils.getGuildIconURL({
            id: guild.id,
            icon: guild.icon,
            size: 16,
        });
        return icon != null ? <img src={icon} alt="" /> : null;
    };

    const renderDmIcon = (e: SelectOption) => {
        if (!e || e.value === "" || e.label === e.value) return null;

        const channel = ChannelStore.getChannel(e.value);

        return channel.recipients.length >= 2 && channel.icon == null ?
            <GroupDMAvatars recipients={channel.recipients} size="SIZE_16" /> : <Avatar src={getDMChannelIcon(channel)} size="SIZE_16" />;
    };

    function renderChannelSelect() {
        const dmOption = { value: "DMs", label: "Direct Messages" };

        const guildSelect = <SearchableSelect
            options={[
                dmOption,
                ...Object.keys(GuildStore.getGuilds()).map(item => {
                    const guild = GuildStore.getGuild(item);
                    if (!guild) return null;
                    return {
                        label: guild.name,
                        value: guild.id,
                    };
                }) as SelectOption[],
            ]}
            multi={false}
            value={!guild ? void 0 : { label: GuildStore.getGuild(guild)?.name || guild, value: guild }}
            closeOnSelect={true}
            placeholder="Select a Server to pick channels from."
            renderOptionPrefix={(e: SelectOption) => {
                if (!e || e.value === "" || e.label === e.value) return null;
                return guildIcon(GuildStore.getGuild(e.value));
            }}
            onChange={(v: string) => setGuild(v)}
        />;

        const channels: Record<string, Channel[]> = {};
        const dmChannels: Channel[] = [];

        for (const item of items) {
            const channel = ChannelStore.getChannel(item);
            if (!channel) continue;
            if (channel.isDM() || channel.isGroupDM()) {
                dmChannels.push(channel);
                continue;
            }
            if (!channels[channel.guild_id]) {
                channels[channel.guild_id] = [];
            }
            channels[channel.guild_id].push(channel);
        }

        const renderChannelSymbol = (e: SelectOption) => {
            if (!e || e.value === "" || e.label === e.value) return null;
            const channel = ChannelStore.getChannel(e.value);
            if (channel.isDM() || channel.isGroupDM()) return renderDmIcon(e);
            return getChannelSymbol(channel)({ size: 16 });
        };

        const getSelectedValues = () => {
            if (guild === "DMs") {
                return dmChannels.map(channel => ({
                    label: channel.name || UserStore.getUser(channel.recipients[0]).username,
                    value: channel.id,
                })) as SelectOption[];
            }
            if (!guild || !channels[guild]) return [];
            return channels[guild].map(channel => ({
                label: channel.name,
                value: channel.id,
            })) as SelectOption[];
        };

        const getOptions = () => {
            if (guild === "DMs") {
                return ChannelStore.getSortedPrivateChannels().map(
                    channel => ({
                        label: channel.name || UserStore.getUser(channel.recipients[0]).username,
                        value: channel.id,
                    })
                ) as SelectOption[];
            }
            if (!guild) return [];
            return ChannelStore.getChannelIds(guild).map((channelId: string) => {
                const channel = ChannelStore.getChannel(channelId);
                if (!channel) return;
                return {
                    label: channel.name,
                    value: channel.id,
                };
            }) as SelectOption[];
        };

        const channelsSelect = <SearchableSelect
            value={!guild ? [] : getSelectedValues()}
            options={!guild ? [] : getOptions()}
            multi={true}
            closeOnSelect={false}
            renderOptionPrefix={renderChannelSymbol}
            isDisabled={!guild}
            placeholder={!guild ? "Select a server first!" : "Search or select channels..."}
            onChange={(vals: Array<SelectOption|string>) => {
                // the latest clicked element is only provided as ID, not as SelectOption.
                const clicked = vals.filter(e => typeof e === "string");
                if (!items.includes(clicked[0])) {
                    setItems([...items, ...clicked]);
                } else {
                    setItems(items.filter(i => i !== clicked[0]));
                }
            }}
        />;

        return <div
            style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
            }}
        >
            {guildSelect}
            {channelsSelect}
        </div>;
    }

    return (
        <SettingsSection name={id} description={option.description} error={error}>
            {renderChannelSelect()}
            {isDevModeEnabled() &&
            <Flex
                flexDirection="row"
                style={{
                    gap: "3px"
                }}
            >
                <TextInput
                    type="text"
                    placeholder="...or enter ChannelId"
                    onChange={v => setText(v)}
                    value={text}
                />
                <Button
                    size={Button.Sizes.MIN}
                    onClick={() => {
                        setItems([...items, text]);
                        setText("");
                    }}
                    disabled={text === "" || error != null}
                    look={Button.Looks.BLANK}
                    style={{ color: "var(--interactive-normal)" }}
                >
                    <PlusIcon/>
                </Button>
            </Flex>}
        </SettingsSection>
    );
}, { noop: true });
