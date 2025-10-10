/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { PlusIcon } from "@components/Icons";
import { PluginOptionArray } from "@utils/types";
import { Guild, SelectOption } from "@vencord/discord-types";
import {
    Button,
    Flex,
    GuildStore,
    IconUtils, React,
    SearchableSelect, TextInput, useEffect,
    useState
} from "@webpack/common";

import { SettingProps, SettingsSection } from "./Common";

const isDevModeEnabled = () => getUserSettingLazy("appearance", "developerMode")?.getSetting() === true;


export const GuildSetting = ErrorBoundary.wrap(function GuildSetting({
    option,
    pluginSettings,
    definedSettings,
    onChange,
    id
}: SettingProps<PluginOptionArray>) {
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<string[]>(ensureSettingsMigrated() || []);
    const [text, setText] = useState<string>("");

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
    }, [text]);

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

    function renderGuildSelect() {
        return <SearchableSelect
            value={items.map(i => {
                const g = GuildStore.getGuild(i);
                if (!g) return;
                return {
                    label: g.name,
                    value: i,
                };
            }).filter(Boolean) as SelectOption[]}
            options={Object.values(GuildStore.getGuilds()).map(guild => ({
                label: guild.name,
                value: guild.id,
            }))}
            multi={true}
            closeOnSelect={false}
            placeholder="Search or select Guilds..."
            renderOptionPrefix={(e: SelectOption) => {
                if (!e || e.value === "" || e.label === e.value) return null;
                return guildIcon(GuildStore.getGuild(e.value));
            }}
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
    }

    return (
        <SettingsSection name={id} description={option.description} error={error}>
            {renderGuildSelect()}
            {isDevModeEnabled() &&
            <Flex
                flexDirection="row"
                style={{
                    gap: "3px"
                }}
            >
                <TextInput
                    type="text"
                    placeholder="...or enter GuildId"
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
                    color={Button.Colors.WHITE}
                >
                    <PlusIcon/>
                </Button>
            </Flex>}
        </SettingsSection>
    );
}, { noop: true });
