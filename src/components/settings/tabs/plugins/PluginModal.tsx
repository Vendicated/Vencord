/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./PluginModal.css";

import { generateId } from "@api/Commands";
import { Settings, useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { debounce } from "@shared/debounce";
import { gitRemote } from "@shared/vencordUserAgent";
import { proxyLazy } from "@utils/lazy";
import { Margins } from "@utils/margins";
import { classes, isObjectEmpty } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { OptionType, Plugin } from "@utils/types";
import { User } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Button, Clickable, FluxDispatcher, Forms, React, Text, Toasts, Tooltip, useEffect, UserStore, UserSummaryItem, UserUtils, useState } from "@webpack/common";
import { Constructor } from "type-fest";

import { PluginMeta } from "~plugins";

import { OptionComponentMap } from "./components";
import { openContributorModal } from "./ContributorModal";
import { GithubButton } from "./LinkIconButton";

const cl = classNameFactory("vc-plugin-modal-");

const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");
const UserRecord: Constructor<Partial<User>> = proxyLazy(() => UserStore.getCurrentUser().constructor) as any;

interface PluginModalProps extends ModalProps {
    plugin: Plugin;
    onRestartNeeded(key: string): void;
}

export function makeDummyUser(user: { username: string; id?: string; avatar?: string; }) {
    const newUser = new UserRecord({
        username: user.username,
        id: user.id ?? generateId(),
        avatar: user.avatar,
        /** To stop discord making unwanted requests... */
        bot: true,
    });

    FluxDispatcher.dispatch({
        type: "USER_UPDATE",
        user: newUser,
    });

    return newUser;
}

export default function PluginModal({ plugin, onRestartNeeded, onClose, transitionState }: PluginModalProps) {
    const pluginSettings = useSettings().plugins[plugin.name];
    const hasSettings = Boolean(pluginSettings && plugin.options && !isObjectEmpty(plugin.options));

    const [authors, setAuthors] = useState<Partial<User>[]>([]);

    useEffect(() => {
        (async () => {
            for (const user of plugin.authors.slice(0, 6)) {
                const author = user.id
                    ? await UserUtils.getUser(`${user.id}`)
                        .catch(() => makeDummyUser({ username: user.name }))
                    : makeDummyUser({ username: user.name });

                setAuthors(a => [...a, author]);
            }
        })();
    }, [plugin.authors]);

    function handleResetClick() {
        openWarningModal(plugin, { onClose, transitionState }, onRestartNeeded);
    }

    function renderSettings() {
        if (!hasSettings || !plugin.options)
            return <Forms.FormText>There are no settings for this plugin.</Forms.FormText>;

        const options = Object.entries(plugin.options).map(([key, setting]) => {
            if (setting.type === OptionType.CUSTOM || setting.hidden) return null;

            function onChange(newValue: any) {
                const option = plugin.options?.[key];
                if (!option || option.type === OptionType.CUSTOM) return;

                pluginSettings[key] = newValue;

                if (option.restartNeeded) onRestartNeeded(key);
            }

            const Component = OptionComponentMap[setting.type];
            return (
                <Component
                    id={key}
                    key={key}
                    option={setting}
                    onChange={debounce(onChange)}
                    pluginSettings={pluginSettings}
                    definedSettings={plugin.settings}
                />
            );
        });

        return (
            <div className="vc-plugins-settings">
                {options}
            </div>
        );
    }

    function renderMoreUsers(_label: string) {
        const remainingAuthors = plugin.authors.slice(6);

        return (
            <Tooltip text={remainingAuthors.map(u => u.name).join(", ")}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className={AvatarStyles.moreUsers}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        +{remainingAuthors.length}
                    </div>
                )}
            </Tooltip>
        );
    }

    const pluginMeta = PluginMeta[plugin.name];

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false} className={Margins.bottom8}>
                <Text variant="heading-xl/bold" style={{ flexGrow: 1 }}>{plugin.name}</Text>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>

            <ModalContent className={Margins.bottom16}>
                <Forms.FormSection>
                    <Flex className={cl("info")}>
                        <Forms.FormText className={cl("description")}>{plugin.description}</Forms.FormText>
                        {!pluginMeta.userPlugin && (
                            <div className="vc-settings-modal-links">
                                <GithubButton
                                    text="View source code"
                                    href={`https://github.com/${gitRemote}/tree/main/${pluginMeta.folderName}`}
                                />
                            </div>
                        )}
                    </Flex>
                    <Text variant="heading-lg/semibold" className={classes(Margins.top8, Margins.bottom8)}>Authors</Text>
                    <div style={{ width: "fit-content" }}>
                        <UserSummaryItem
                            users={authors}
                            guildId={undefined}
                            renderIcon={false}
                            showDefaultAvatarsForNullUsers
                            renderMoreUsers={renderMoreUsers}
                            renderUser={(user: User) => (
                                <Clickable
                                    className={AvatarStyles.clickableAvatar}
                                    onClick={() => openContributorModal(user)}
                                >
                                    <img
                                        className={AvatarStyles.avatar}
                                        src={user.getAvatarURL(void 0, 80, true)}
                                        alt={user.username}
                                        title={user.username}
                                    />
                                </Clickable>
                            )}
                        />
                    </div>
                </Forms.FormSection>

                {!!plugin.settingsAboutComponent && (
                    <div className={Margins.top16}>
                        <Forms.FormSection>
                            <ErrorBoundary message="An error occurred while rendering this plugin's custom Info Component">
                                <plugin.settingsAboutComponent />
                            </ErrorBoundary>
                        </Forms.FormSection>
                    </div>
                )}

                <Forms.FormSection>
                    <Text variant="heading-lg/semibold" className={classes(Margins.top16, Margins.bottom8)}>Settings</Text>
                    {renderSettings()}
                </Forms.FormSection>
            </ModalContent>
            {
                hasSettings && <ModalFooter>
                    <Flex flexDirection="column" style={{ width: "100%" }}>
                        <Flex style={{ justifyContent: "space-between" }}>
                            <Tooltip text="Reset to default settings" shouldShow={!isObjectEmpty(pluginSettings)}>
                                {({ onMouseEnter, onMouseLeave }) => (
                                    <Button
                                        className={cl("disable-warning")}
                                        size={Button.Sizes.SMALL}
                                        color={Button.Colors.BRAND}
                                        onClick={handleResetClick}
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}
                                    >
                                        Reset
                                    </Button>
                                )}
                            </Tooltip>
                        </Flex>
                    </Flex>
                </ModalFooter>
            }
        </ModalRoot >
    );
}

export function openPluginModal(plugin: Plugin, onRestartNeeded?: (pluginName: string, key: string) => void) {
    openModal(modalProps => (
        <PluginModal
            {...modalProps}
            plugin={plugin}
            onRestartNeeded={(key: string) => onRestartNeeded?.(plugin.name, key)}
        />
    ));
}

function resetSettings(plugin: Plugin, warningModalProps?: ModalProps, pluginModalProps?: ModalProps, onRestartNeeded?: (pluginName: string) => void) {
    const defaultSettings = plugin.settings?.def;
    const pluginName = plugin.name;

    if (!defaultSettings) {
        console.error(`No default settings found for ${pluginName}`);
        return;
    }

    const newSettings: Record<string, any> = {};
    let restartNeeded = false;

    for (const key in defaultSettings) {
        if (key === "enabled") continue;

        const setting = defaultSettings[key];
        setting.type = setting.type ?? OptionType.STRING;

        if (setting.type === OptionType.STRING) {
            newSettings[key] = setting.default !== undefined && setting.default !== "" ? setting.default : "";
        } else if ("default" in setting && setting.default !== undefined) {
            newSettings[key] = setting.default;
        }

        if (setting?.restartNeeded) {
            restartNeeded = true;
        }
    }


    const currentSettings = plugin.settings?.store;
    if (currentSettings) {
        Object.assign(currentSettings, newSettings);
    }

    if (restartNeeded) {
        onRestartNeeded?.(plugin.name);
    }

    Toasts.show({
        message: `Settings for ${pluginName} have been reset.`,
        id: Toasts.genId(),
        type: Toasts.Type.SUCCESS,
        options: {
            position: Toasts.Position.TOP
        }
    });

    warningModalProps?.onClose();
    pluginModalProps?.onClose();
}

export function openWarningModal(plugin?: Plugin | null, pluginModalProps?: ModalProps | null, onRestartNeeded?: (pluginName: string) => void, isPlugin = true, enabledPlugins?: number | null, reset?: any) {
    if (Settings.ignoreResetWarning && isPlugin) {
        if (plugin && pluginModalProps) return resetSettings(plugin, pluginModalProps, pluginModalProps, onRestartNeeded);
        return;
    } else if (Settings.ignoreResetWarning && !isPlugin) {
        return reset();
    }

    const text = isPlugin
        ? `You are about to reset all settings for ${plugin?.name} to their default values.`
        : `You are about to disable ${enabledPlugins} plugins!`;

    openModal(warningModalProps => (
        <ModalRoot
            {...warningModalProps}
            size={ModalSize.SMALL}
            className="vc-text-selectable"
            transitionState={warningModalProps.transitionState}
        >
            <ModalHeader separator={false}>
                <Text className="text-danger">Dangerous Action</Text>
                <ModalCloseButton onClick={warningModalProps.onClose} className="vc-modal-close-button" />
            </ModalHeader>
            <ModalContent>
                <Forms.FormSection>
                    <Flex className="vc-warning-info">
                        <Text className="text-normal">
                            {text}
                        </Text>
                        <Text className="warning-text">
                            THIS ACTION IS IRREVERSIBLE!
                        </Text>
                        <Text className="text-normal margin-bottom">
                            If you are certain you want to proceed, click <strong>Confirm Reset</strong>. Otherwise, click <strong>Cancel</strong>.
                        </Text>
                    </Flex>
                </Forms.FormSection>
            </ModalContent>
            <ModalFooter className="vc-modal-footer">
                <Flex className="vc-button-container">
                    <Flex className="button-group">
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.PRIMARY}
                            onClick={warningModalProps.onClose}
                            look={Button.Looks.FILLED}
                        >
                            Cancel
                        </Button>
                        {!Settings.ignoreResetWarning && (
                            <Button
                                size={Button.Sizes.SMALL}
                                className={cl("disable-warning")}
                                onClick={() => {
                                    Settings.ignoreResetWarning = true;
                                }}
                            >
                                Disable Warning Forever
                            </Button>
                        )}
                        <Button
                            size={Button.Sizes.SMALL}
                            onClick={() => {
                                if (isPlugin) {
                                    if (plugin && pluginModalProps)
                                        resetSettings(plugin, pluginModalProps, pluginModalProps, onRestartNeeded);
                                } else {
                                    reset();
                                }
                            }}
                            className={cl("confirm-reset")}
                        >
                            Confirm Reset
                        </Button>
                    </Flex>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    ));
}
