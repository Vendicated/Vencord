/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { convertToArray } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { PlusIcon } from "@components/Icons";
import { PluginOptionArray } from "@utils/types";
import { Guild, SelectOption } from "@vencord/discord-types";
import {
    Button,
    Flex, GuildRoleStore,
    GuildStore,
    IconUtils,
    React,
    SearchableSelect,
    TextInput, useEffect,
    useState,
} from "@webpack/common";

import { SettingProps, SettingsSection } from "./Common";

const isDevModeEnabled = () => getUserSettingLazy("appearance", "developerMode")?.getSetting() === true;


export const RoleSetting = ErrorBoundary.wrap(function RoleSetting({
    option,
    pluginSettings,
    definedSettings,
    onChange,
    id
}: SettingProps<PluginOptionArray>) {
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<string[]>(ensureSettingsMigrated());
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

    function ensureSettingsMigrated(): string[] {
        // in case the settings get manually overridden without a restart of Vencord itself this will prevent crashing
        const migrated = convertToArray(pluginSettings[id], option.oldStringSeparator ?? ",");
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

    function renderRoleSelect() {
        const renderRoleSymbol = (e: SelectOption) => {
            if (!e || e.value === "" || e.label === e.value || !guild) return null;
            const role = GuildRoleStore.getRole(guild, e.value);
            if (!role || !role.icon) return null;
            return <img
                src={`${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/role-icons/${role.id}/${role.icon}.webp?size=24&quality=lossless`}
                alt={"role icon"}
            />;
        };

        const guildSelect = <SearchableSelect
            options={Object.keys(GuildStore.getGuilds()).map(item => {
                const guild = GuildStore.getGuild(item);
                if (!guild) return null;
                return {
                    label: guild.name,
                    value: guild.id,
                };
            }) as SelectOption[]}
            multi={false}
            value={!guild ? void 0 : { label: GuildStore.getGuild(guild)?.name || guild, value: guild }}
            closeOnSelect={true}
            placeholder="Select a Server to pick roles from."
            renderOptionPrefix={(e: SelectOption) => {
                if (!e || e.value === "" || e.label === e.value) return null;
                return guildIcon(GuildStore.getGuild(e.value));
            }}
            onChange={(v: string) => setGuild(v)}
        />;


        // TOOD add invalidRoles clearing function

        const getSelectedValues = () => {
            if (!guild) return [];
            return GuildRoleStore.getSortedRoles(guild).filter(r => items.includes(r.id)).map(role => ({
                label: role.name,
                value: role.id,
            })) as SelectOption[];
        };

        const getOptions = () => {
            if (!guild) return [];
            return GuildRoleStore.getSortedRoles(guild).filter(r => r.id !== guild).map(role => {
                return {
                    label: role.name,
                    value: role.id,
                };
            }) as SelectOption[];
        };


        const rolesSelect = <SearchableSelect
            value={!guild ? [] : getSelectedValues()}
            options={!guild ? [] : getOptions()}
            multi={true}
            closeOnSelect={false}
            renderOptionPrefix={renderRoleSymbol}
            isDisabled={!guild}
            placeholder={!guild ? "Select a server first!" : "Search or select roles..."}
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
            {rolesSelect}
        </div>;

    }

    return (
        <SettingsSection name={id} description={option.description} error={error}>
            {renderRoleSelect()}
            {isDevModeEnabled() &&
            <Flex
                flexDirection="row"
                style={{
                    gap: "3px"
                }}
            >
                <TextInput
                    type="text"
                    placeholder="...or enter RoleId"
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
                    <PlusIcon />
                </Button>
            </Flex>}
        </SettingsSection>
    );
}, { noop: true });
