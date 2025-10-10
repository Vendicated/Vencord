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
    Avatar,
    Button,
    Flex,
    IconUtils, React,
    SearchableSelect, TextInput, useEffect,
    UserStore,
    useState
} from "@webpack/common";

import { SettingProps, SettingsSection } from "./Common";

const isDevModeEnabled = () => getUserSettingLazy("appearance", "developerMode")?.getSetting() === true;


export const UserSetting = ErrorBoundary.wrap(function UserSetting({
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

    function renderUserSelect() {
       return <SearchableSelect
            value={items.map(i => {
                const user = UserStore.getUser(i);
                if (!user) return;
                return {
                    label: user.globalName || user.username,
                    value: i,
                };
            }).filter(Boolean) as SelectOption[]}
            options={Object.values(UserStore.getUsers()).map(user => ({
                label: user.globalName || user.username,
                value: user.id,
            }))}
            multi={true}
            closeOnSelect={false}
            placeholder="Search or select Users..."
            renderOptionPrefix={(e: SelectOption) => {
                if (!e || e.value === "" || e.label === e.value) return null;
                return <Avatar src={UserStore.getUser(e.value).getAvatarURL()} size="SIZE_16" />;
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
            {renderUserSelect()}
            {isDevModeEnabled() &&
            <Flex
                flexDirection="row"
                style={{
                    gap: "3px"
                }}
            >
                <TextInput
                    type="text"
                    placeholder="...or enter UserId"
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
