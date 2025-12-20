/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Settings, useSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { PluginDependencyList } from "@components/settings/tabs/plugins";
import { PluginCard } from "@components/settings/tabs/plugins/PluginCard";
import { ChangeList } from "@utils/ChangeList";
import { classNameFactory } from "@utils/css";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import { findComponentByCodeLazy } from "@webpack";
import { Tooltip, useMemo } from "@webpack/common";
import { ReactNode } from "react";

import Plugins from "~plugins";

import { getNewPlugins, getNewSettings, KnownPluginSettingsMap, writeKnownSettings } from "./knownSettings";

const cl = classNameFactory("vc-new-plugins-");

const CloseButton = findComponentByCodeLazy("CLOSE_BUTTON_LABEL");
const Checkbox = findComponentByCodeLazy(".checkboxWrapperDisabled:");

let hasSeen = false;

interface ModalComponentProps {
    modalProps: ModalProps;
    newPlugins: Set<string>;
    newSettings: KnownPluginSettingsMap;
}

function NewPluginsModal({ modalProps, newPlugins, newSettings }: ModalComponentProps) {
    const settings = useSettings();
    const changes = useMemo(() => new ChangeList<string>(), []);
    const forceUpdate = useForceUpdater();

    const depMap = useMemo(() => {
        const o = {} as Record<string, string[]>;
        for (const plugin in Plugins) {
            const deps = Plugins[plugin].dependencies;
            if (deps) {
                for (const dep of deps) {
                    o[dep] ??= [];
                    o[dep].push(plugin);
                }
            }
        }
        return o;
    }, []);

    const sortedPlugins = useMemo(() => {
        const mapPlugins = (array: string[]) => array.map(pn => Plugins[pn]).sort((a, b) => a.name.localeCompare(b.name));
        return [
            ...mapPlugins([...newPlugins]),
            ...mapPlugins([...newSettings.keys()].filter(p => !newPlugins.has(p)))
        ];
    }, []);

    const onRestartNeeded = (name: string) => {
        changes.handleChange(name);
        forceUpdate();
    };

    const pluginCards: ReactNode[] = [];
    const requiredPluginCards: ReactNode[] = [];

    for (const p of sortedPlugins) {
        if (p.hidden) continue;

        const isRequired = p.required || depMap[p.name]?.some(d => settings.plugins[d].enabled);

        if (isRequired) {
            const tooltipText = p.required
                ? "This plugin is required for Equicord to function."
                : <PluginDependencyList deps={depMap[p.name]?.filter(d => settings.plugins[d].enabled)} />;

            requiredPluginCards.push(
                <Tooltip text={tooltipText} key={p.name}>
                    {({ onMouseLeave, onMouseEnter }) => (
                        <PluginCard
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            onRestartNeeded={onRestartNeeded}
                            disabled={true}
                            plugin={p}
                            isNew={newPlugins.has(p.name)}
                        />
                    )}
                </Tooltip>
            );
        } else {
            pluginCards.push(
                <PluginCard
                    onRestartNeeded={onRestartNeeded}
                    disabled={false}
                    plugin={p}
                    key={p.name}
                    isNew={newPlugins.has(p.name)}
                />
            );
        }
    }

    const totalCount = pluginCards.length + requiredPluginCards.length;

    const handleContinue = async () => {
        await writeKnownSettings();
        if (changes.hasChanges) {
            location.reload();
        } else {
            modalProps.onClose();
        }
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false} className={cl("header")}>
                <div className={cl("header-content")}>
                    <BaseText size="lg" weight="semibold" className={cl("title")}>
                        New Plugins and Settings ({totalCount})
                    </BaseText>
                    <BaseText size="sm" className={cl("description")}>
                        New plugins have been added since your last visit. Enable any you'd like or continue to dismiss.
                    </BaseText>
                </div>
                <div className={cl("header-trailing")}>
                    <CloseButton onClick={modalProps.onClose} />
                </div>
            </ModalHeader>

            <ModalContent>
                <div className={cl("grid")}>
                    {pluginCards}
                    {requiredPluginCards}
                </div>
            </ModalContent>

            <ModalFooter>
                <Flex className={cl("footer")}>
                    <Tooltip
                        text={
                            <>
                                The following plugins require a restart:
                                <ul className={cl("restart-list")}>
                                    {changes.map(p => <li key={p}>{p}</li>)}
                                </ul>
                            </>
                        }
                        shouldShow={changes.hasChanges}
                    >
                        {tooltipProps => (
                            <Button
                                {...tooltipProps}
                                onClick={handleContinue}
                            >
                                {changes.hasChanges ? "Restart" : "Continue"}
                            </Button>
                        )}
                    </Tooltip>

                    <Checkbox
                        type="inverted"
                        value={!settings?.plugins?.NewPluginsManager?.enabled}
                        onChange={() => {
                            Settings.plugins.NewPluginsManager.enabled = !settings?.plugins?.NewPluginsManager?.enabled;
                        }}
                    >
                        Don't show this again
                    </Checkbox>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

export async function openNewPluginsModal() {
    const newPlugins = await getNewPlugins();
    const newSettings = await getNewSettings();
    if ((newPlugins.size || newSettings.size) && !hasSeen) {
        hasSeen = true;
        const modalKey = openModal(modalProps => (
            <ErrorBoundary noop onError={() => closeModal(modalKey)}>
                <NewPluginsModal
                    modalProps={modalProps}
                    newPlugins={newPlugins}
                    newSettings={newSettings}
                />
            </ErrorBoundary>
        ));
    }
}
