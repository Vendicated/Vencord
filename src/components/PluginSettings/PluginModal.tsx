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
import { gitRemote } from "@shared/vencordUserAgent";
import { proxyLazy } from "@utils/lazy";
import { Margins } from "@utils/margins";
import { classes, isObjectEmpty } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { OptionType, Plugin } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Clickable, FluxDispatcher, Forms, React, Text, Toasts, Tooltip, UserStore, UserUtils } from "@webpack/common";
import { User } from "discord-types/general";
import { Constructor } from "type-fest";

import { PluginMeta } from "~plugins";

import {
    ISettingElementProps,
    SettingBooleanComponent,
    SettingCustomComponent,
    SettingNumericComponent,
    SettingSelectComponent,
    SettingSliderComponent,
    SettingTextComponent
} from "./components";
import { openContributorModal } from "./ContributorModal";
import { GithubButton } from "./LinkIconButton";

const cl = classNameFactory("vc-plugin-modal-");

const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");
const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");
const UserRecord: Constructor<Partial<User>> = proxyLazy(() => UserStore.getCurrentUser().constructor) as any;

interface PluginModalProps extends ModalProps {
    plugin: Plugin;
    onRestartNeeded(): void;
}

function makeDummyUser(user: { username: string; id?: string; avatar?: string; }) {
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

const Components: Record<OptionType, React.ComponentType<ISettingElementProps<any>>> = {
    [OptionType.STRING]: SettingTextComponent,
    [OptionType.NUMBER]: SettingNumericComponent,
    [OptionType.BIGINT]: SettingNumericComponent,
    [OptionType.BOOLEAN]: SettingBooleanComponent,
    [OptionType.SELECT]: SettingSelectComponent,
    [OptionType.SLIDER]: SettingSliderComponent,
    [OptionType.COMPONENT]: SettingCustomComponent
};

export default function PluginModal({ plugin, onRestartNeeded, onClose, transitionState }: PluginModalProps) {
    const [authors, setAuthors] = React.useState<Partial<User>[]>([]);

    const pluginSettings = useSettings().plugins[plugin.name];

    const [tempSettings, setTempSettings] = React.useState<Record<string, any>>({});

    const [errors, setErrors] = React.useState<Record<string, boolean>>({});
    const [saveError, setSaveError] = React.useState<string | null>(null);

    const canSubmit = () => Object.values(errors).every(e => !e);

    const hasSettings = Boolean(pluginSettings && plugin.options && !isObjectEmpty(plugin.options));

    React.useEffect(() => {
        (async () => {
            for (const user of plugin.authors.slice(0, 6)) {
                const author = user.id
                    ? await UserUtils.getUser(`${user.id}`)
                        .catch(() => makeDummyUser({ username: user.name }))
                    : makeDummyUser({ username: user.name });

                setAuthors(a => [...a, author]);
            }
        })();
    }, []);

    async function saveAndClose() {
        if (!plugin.options) {
            onClose();
            return;
        }

        if (plugin.beforeSave) {
            const result = await Promise.resolve(plugin.beforeSave(tempSettings));
            if (result !== true) {
                setSaveError(result);
                return;
            }
        }

        let restartNeeded = false;
        for (const [key, value] of Object.entries(tempSettings)) {
            const option = plugin.options[key];
            pluginSettings[key] = value;
            option?.onChange?.(value);
            if (option?.restartNeeded) restartNeeded = true;
        }
        if (plugin.afterSave) {
            plugin.afterSave();
        }
        if (restartNeeded) onRestartNeeded();
        onClose();
    }

    function handleResetClick() {
        openWarningModal(plugin, { onClose, transitionState }, onRestartNeeded);
    }

    function renderSettings() {
        if (!hasSettings || !plugin.options) {
            return <Forms.FormText>There are no settings for this plugin.</Forms.FormText>;
        } else {
            const options = Object.entries(plugin.options).map(([key, setting]) => {
                if (setting.hidden) return null;

                function onChange(newValue: any) {
                    setTempSettings(s => ({ ...s, [key]: newValue }));
                }

                function onError(hasError: boolean) {
                    setErrors(e => ({ ...e, [key]: hasError }));
                }

                const Component = Components[setting.type];
                return (
                    <Component
                        id={key}
                        key={key}
                        option={setting}
                        onChange={onChange}
                        onError={onError}
                        pluginSettings={pluginSettings}
                        definedSettings={plugin.settings}
                    />
                );
            });

            return <Flex flexDirection="column" style={{ gap: 12, marginBottom: 16 }}>{options}</Flex>;
        }
    }

    function renderMoreUsers(_label: string, count: number) {
        const sliceCount = plugin.authors.length - count;
        const sliceStart = plugin.authors.length - sliceCount;
        const sliceEnd = sliceStart + plugin.authors.length - count;

        return (
            <Tooltip text={plugin.authors.slice(sliceStart, sliceEnd).map(u => u.name).join(", ")}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className={AvatarStyles.moreUsers}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        +{sliceCount}
                    </div>
                )}
            </Tooltip>
        );
    }

    /*
    function switchToPopout() {
        onClose();

        const PopoutKey = `DISCORD_VENCORD_PLUGIN_SETTINGS_MODAL_${plugin.name}`;
        PopoutActions.open(
            PopoutKey,
            () => <PluginModal
                transitionState={transitionState}
                plugin={plugin}
                onRestartNeeded={onRestartNeeded}
                onClose={() => PopoutActions.close(PopoutKey)}
            />
        );
    }
    */

    const pluginMeta = PluginMeta[plugin.name];

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.MEDIUM} className="vc-text-selectable">
            <ModalHeader separator={false}>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>{plugin.name}</Text>

                {/*
                <Button look={Button.Looks.BLANK} onClick={switchToPopout}>
                    <OpenExternalIcon aria-label="Open in Popout" />
                </Button>
                */}
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
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
                    <Forms.FormTitle tag="h3" style={{ marginTop: 8, marginBottom: 0 }}>Authors</Forms.FormTitle>
                    <div style={{ width: "fit-content", marginBottom: 8 }}>
                        <UserSummaryItem
                            users={authors}
                            count={plugin.authors.length}
                            guildId={undefined}
                            renderIcon={false}
                            max={6}
                            showDefaultAvatarsForNullUsers
                            showUserPopout
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
                    <div className={classes(Margins.bottom8, "vc-text-selectable")}>
                        <Forms.FormSection>
                            <ErrorBoundary message="An error occurred while rendering this plugin's custom InfoComponent">
                                <plugin.settingsAboutComponent tempSettings={tempSettings} />
                            </ErrorBoundary>
                        </Forms.FormSection>
                    </div>
                )}
                <Forms.FormSection className={Margins.bottom16}>
                    <Forms.FormTitle tag="h3">Settings</Forms.FormTitle>
                    {renderSettings()}
                </Forms.FormSection>
            </ModalContent>
            {hasSettings && <ModalFooter>
                <Flex flexDirection="column" style={{ width: "100%" }}>
                    <Flex style={{ justifyContent: "space-between" }}>
                        <Tooltip text="Reset to default settings" shouldShow={!isObjectEmpty(tempSettings)}>
                            {({ onMouseEnter, onMouseLeave }) => (
                                <Button
                                    className="button-danger-background"
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
                        <Flex style={{ marginLeft: "auto" }}>
                            <Button
                                onClick={onClose}
                                size={Button.Sizes.SMALL}
                                color={Button.Colors.PRIMARY}
                                look={Button.Looks.LINK}
                            >
                                Cancel
                            </Button>
                            <Tooltip text="You must fix all errors before saving" shouldShow={!canSubmit()}>
                                {({ onMouseEnter, onMouseLeave }) => (
                                    <Button
                                        size={Button.Sizes.SMALL}
                                        color={Button.Colors.BRAND}
                                        onClick={saveAndClose}
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}
                                        disabled={!canSubmit()}
                                    >
                                        Save & Close
                                    </Button>
                                )}
                            </Tooltip>
                        </Flex>
                    </Flex>
                    {saveError && <Text variant="text-md/semibold" style={{ color: "var(--text-danger)" }}>Error while saving: {saveError}</Text>}
                </Flex>
            </ModalFooter>}
        </ModalRoot>
    );
}

export function openPluginModal(plugin: Plugin, onRestartNeeded?: (pluginName: string) => void) {
    openModal(modalProps => (
        <PluginModal
            {...modalProps}
            plugin={plugin}
            onRestartNeeded={() => onRestartNeeded?.(plugin.name)}
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

    if (plugin.afterSave) {
        plugin.afterSave();
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

export function openWarningModal(plugin: Plugin, pluginModalProps: ModalProps, onRestartNeeded?: (pluginName: string) => void) {
    if (Settings.ignoreResetWarning) return resetSettings(plugin, pluginModalProps, pluginModalProps, onRestartNeeded);

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
                        <img
                            src="https://media.tenor.com/Y6DXKZiBCs8AAAAi/stavario-josefbenes.gif"
                            alt="Warning"
                        />
                        <Text className="text-normal">
                            You are about to reset all settings for <strong>{plugin.name}</strong> to their default values.
                        </Text>
                        <Text className="text-danger">
                            THIS ACTION IS IRREVERSIBLE
                        </Text>
                        <Text className="text-normal margin-bottom">
                            If you are certain you want to proceed, click <strong>Confirm Reset</strong>. Otherwise, click <strong>Cancel</strong>.
                        </Text>
                    </Flex>
                </Forms.FormSection>
            </ModalContent>
            <ModalFooter className="modal-footer">
                <Flex className="button-container">
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.PRIMARY}
                        onClick={warningModalProps.onClose}
                        look={Button.Looks.LINK}
                    >
                        Cancel
                    </Button>
                    <Flex className="button-group">
                        {!Settings.ignoreResetWarning && (
                            <Button
                                size={Button.Sizes.SMALL}
                                className="button-danger-background"
                                onClick={() => {
                                    Settings.ignoreResetWarning = true;
                                }}
                            >
                                Disable Warning Forever
                            </Button>
                        )}
                        <Tooltip text="This action cannot be undone. Are you sure?" shouldShow={true}>
                            {({ onMouseEnter, onMouseLeave }) => (
                                <Button
                                    size={Button.Sizes.SMALL}
                                    onClick={() => {
                                        resetSettings(plugin, pluginModalProps, pluginModalProps, onRestartNeeded);
                                    }}
                                    onMouseEnter={onMouseEnter}
                                    onMouseLeave={onMouseLeave}
                                    className="button-danger-background-no-margin"
                                >
                                    Confirm Reset
                                </Button>
                            )}
                        </Tooltip>
                    </Flex>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    ));
}
