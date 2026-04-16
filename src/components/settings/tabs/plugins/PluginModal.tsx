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
import { useSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { debounce } from "@shared/debounce";
import { gitRemote } from "@shared/vencordUserAgent";
import { classNameFactory } from "@utils/css";
import { proxyLazy } from "@utils/lazy";
import { Margins } from "@utils/margins";
import { classes, isObjectEmpty } from "@utils/misc";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { OptionType, Plugin } from "@utils/types";
import { User } from "@vencord/discord-types";
import { findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { Clickable, FluxDispatcher, React, Toasts, Tooltip, useEffect, useMemo, UserStore, UserSummaryItem, UserUtils, useState } from "@webpack/common";
import { Constructor } from "type-fest";

import { PluginMeta } from "~plugins";

import { OptionComponentMap } from "./components";
import { openContributorModal } from "./ContributorModal";
import { GithubButton, WebsiteButton } from "./LinkIconButton";

const cl = classNameFactory("vc-plugin-modal-");

const AvatarStyles = findCssClassesLazy("moreUsers", "avatar", "clickableAvatar");
const CloseButton = findComponentByCodeLazy("CLOSE_BUTTON_LABEL");
const ConfirmModal = findComponentByCodeLazy('parentComponent:"ConfirmModal"');
const WarningIcon = findComponentByCodeLazy("3.15H3.29c-1.74");
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
    const pluginSettings = useSettings([`plugins.${plugin.name}.*`]).plugins[plugin.name];
    const hasSettings = Boolean(pluginSettings && plugin.options && !isObjectEmpty(plugin.options));

    // avoid layout shift by showing dummy users while loading users
    const fallbackAuthors = useMemo(() => [makeDummyUser({ username: "Loading...", id: "-1465912127305809920" })], []);
    const [authors, setAuthors] = useState<Partial<User>[]>([]);

    useEffect(() => {
        (async () => {
            for (const [index, user] of plugin.authors.slice(0, 6).entries()) {
                try {
                    const author = user.id
                        ? await UserUtils.getUser(String(user.id))
                            .catch(() => makeDummyUser({ username: user.name }))
                        : makeDummyUser({ username: user.name });

                    setAuthors(a => [...a, author]);
                } catch (e) {
                    continue;
                }
            }
        })();
    }, [plugin.authors]);

    function handleResetClick() {
        openWarningModal(plugin, onRestartNeeded);
    }

    function renderSettings() {
        if (!hasSettings || !plugin.options)
            return <Paragraph>There are no settings for this plugin.</Paragraph>;

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
                <ErrorBoundary noop key={key}>
                    <Component
                        id={key}
                        option={setting}
                        onChange={debounce(onChange)}
                        pluginSettings={pluginSettings}
                        definedSettings={plugin.settings}
                    />
                </ErrorBoundary>
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
    const isEquicordPlugin = pluginMeta.folderName.startsWith("src/equicordplugins/") ?? false;

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false} className={cl("header")}>
                <div className={cl("header-content")}>
                    <BaseText size="lg" weight="semibold" className={cl("title")}>{plugin.name}</BaseText>
                    <BaseText size="sm" className={cl("description")}>{plugin.description}</BaseText>
                    {!!plugin.settingsAboutComponent && (
                        <div className={Margins.top8}>
                            <ErrorBoundary message="An error occurred while rendering this plugin's custom Info Component">
                                <plugin.settingsAboutComponent />
                            </ErrorBoundary>
                        </div>
                    )}
                </div>
                <div className={cl("header-trailing")}>
                    <CloseButton onClick={onClose} />
                </div>
            </ModalHeader>

            <ModalContent className={"vc-settings-modal-content"}>
                <section>
                    <BaseText size="lg" weight="semibold" color="text-strong" className={Margins.bottom8}>Authors</BaseText>
                    <div style={{ width: "fit-content" }}>
                        <ErrorBoundary noop>
                            <UserSummaryItem
                                users={authors.length ? authors : fallbackAuthors}
                                guildId={undefined}
                                renderIcon={false}
                                showDefaultAvatarsForNullUsers
                                renderMoreUsers={renderMoreUsers}
                                renderUser={(user: User) => (
                                    <Clickable
                                        className={AvatarStyles.clickableAvatar}
                                        onClick={() => isEquicordPlugin ? openContributorModal(user) : openContributorModal(user)}
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
                        </ErrorBoundary>
                    </div>
                </section>

                <section>
                    <BaseText size="lg" weight="semibold" color="text-strong" className={classes(Margins.top16, Margins.bottom8)}>Settings</BaseText>
                    {renderSettings()}
                </section>
            </ModalContent>
            <ModalFooter>
                <Flex flexDirection="column" style={{ width: "100%" }}>
                    <Flex style={{ justifyContent: "space-between", alignItems: "center" }}>
                        {hasSettings ? (
                            <Tooltip text="Reset to default settings" shouldShow={!isObjectEmpty(pluginSettings)}>
                                {({ onMouseEnter, onMouseLeave }) => (
                                    <Button
                                        className={cl("disable-warning")}
                                        size="small"
                                        variant="primary"
                                        onClick={handleResetClick}
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}
                                    >
                                        Reset
                                    </Button>
                                )}
                            </Tooltip>
                        ) : <div />}
                        {!pluginMeta.userPlugin && (
                            <div className={cl("links")}>
                                <WebsiteButton
                                    text="Website"
                                    href={isEquicordPlugin ? `https://equicord.org/plugins/${plugin.name}` : `https://vencord.dev/plugins/${plugin.name}`}
                                />
                                <GithubButton
                                    text="Source Code"
                                    href={`https://github.com/${gitRemote}/tree/main/${pluginMeta.folderName}`}
                                />
                            </div>
                        )}
                    </Flex>
                </Flex>
            </ModalFooter>
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

function resetSettings(plugin: Plugin, onRestartNeeded?: (pluginName: string) => void) {
    const defaultSettings = plugin.settings?.def;
    const pluginName = plugin.name;

    if (!defaultSettings) return;

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
}

export function openWarningModal(plugin?: Plugin | null, onRestartNeeded?: (pluginName: string) => void, isPlugin = true, enabledPlugins?: number | null, reset?: () => void) {
    openModal(props => (
        <ConfirmModal
            {...props}
            className={cl("confirm")}
            header={isPlugin ? "Reset Settings" : "Disable Plugins"}
            confirmText={isPlugin ? "Reset" : "Disable All"}
            cancelText="Cancel"
            onConfirm={() => {
                if (isPlugin && plugin) {
                    resetSettings(plugin, onRestartNeeded);
                } else {
                    reset?.();
                }
            }}
            onCancel={props.onClose}
        >
            <Paragraph>
                {isPlugin
                    ? <>Are you sure you want to reset all settings for <strong>{plugin?.name}</strong> to their default values?</>
                    : `Are you sure you want to disable ${enabledPlugins} plugins?`
                }
            </Paragraph>
            <div className={classes(Margins.top16, cl("warning"))}>
                <WarningIcon color="var(--text-feedback-critical)" />
                <span>This action cannot be undone.</span>
            </div>
        </ConfirmModal>
    ));
}
