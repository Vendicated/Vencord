/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./NewPluginsModal.css";

import { Settings, useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { PluginCard } from "@components/settings/tabs/plugins";
import { ChangeList } from "@utils/ChangeList";
import { classes, Margins } from "@utils/index";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import { findComponentByCodeLazy } from "@webpack";
import { Button, Flex, Forms, React, Text, Tooltip, useMemo } from "@webpack/common";
import { JSX } from "react";

import Plugins from "~plugins";

import { getNewPlugins, getNewSettings, KnownPluginSettingsMap, writeKnownSettings } from "./knownSettings";

const cl = classNameFactory("vc-plugins-");

const Checkbox = findComponentByCodeLazy(".checkboxWrapperDisabled:");

let hasSeen = false;

// Most of this was stolen from PluginSettings directly.

export function NewPluginsModal({ modalProps, newPlugins, newSettings }: { modalProps: ModalProps; newPlugins: Set<string>; newSettings: KnownPluginSettingsMap; }) {
    const settings = useSettings();
    const changes = React.useMemo(() => new ChangeList<string>(), []);
    let updateContinueButton = () => { };

    const depMap = React.useMemo(() => {
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

    const mapPlugins = (array: string[]) => array.map(pn => Plugins[pn])
        .sort((a, b) => a.name.localeCompare(b.name));

    const sortedPlugins = useMemo(() => [
        ...mapPlugins([...newPlugins]),
        ...mapPlugins([...newSettings.keys()].filter(p => !newPlugins.has(p)))
    ], []);

    const plugins = [] as JSX.Element[];
    const requiredPlugins = [] as JSX.Element[];

    for (const p of sortedPlugins) {
        if (p.hidden)
            continue;

        const isRequired = p.required || depMap[p.name]?.some(d => settings.plugins[d].enabled);

        if (isRequired) {
            const tooltipText = p.required
                ? "This plugin is required for Vencord to function."
                : makeDependencyList(depMap[p.name]?.filter(d => settings.plugins[d].enabled));

            requiredPlugins.push(
                <Tooltip text={tooltipText} key={p.name}>
                    {({ onMouseLeave, onMouseEnter }) => (
                        <PluginCard
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            onRestartNeeded={name => {
                                changes.handleChange(name);
                                updateContinueButton();
                            }}
                            disabled={true}
                            plugin={p}
                            key={p.name}
                            isNew={newPlugins.has(p.name)}
                        />
                    )}
                </Tooltip>
            );
        } else {
            plugins.push(
                <PluginCard
                    onRestartNeeded={name => {
                        changes.handleChange(name);
                        updateContinueButton();
                    }}
                    disabled={false}
                    plugin={p}
                    key={p.name}
                    isNew={newPlugins.has(p.name)}
                />
            );
        }
    }


    return <ModalRoot {...modalProps} size={ModalSize.MEDIUM} >
        <ModalHeader>
            <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>New Plugins and Settings ({[...plugins, ...requiredPlugins].length})</Text>
            <Tooltip text="Dismiss for this session">
                {tooltipProps =>
                    <div {...tooltipProps}>
                        <ModalCloseButton
                            onClick={modalProps.onClose}
                            className={classes(cl("close"), "vc-newPluginsManager-close")}
                        />
                    </div>
                }
            </Tooltip>
        </ModalHeader>
        <ModalContent>
            <div className={cl("grid")}>
                {[...plugins, ...requiredPlugins]}
            </div>
        </ModalContent>
        <ModalFooter>
            <Flex direction={Flex.Direction.HORIZONTAL_REVERSE}>
                <ContinueButton
                    close={modalProps.onClose}
                    changes={changes}
                    callback={(v: () => void) => updateContinueButton = v}
                />
            </Flex>
            <Flex direction={Flex.Direction.HORIZONTAL}>
                <div className="vc-newPluginsManager-disable-wrapper">
                    <Checkbox
                        type="inverted"
                        value={!settings?.plugins?.NewPluginsManager?.enabled}
                        onChange={() => {
                            Settings.plugins.NewPluginsManager.enabled = !settings?.plugins?.NewPluginsManager?.enabled;
                        }}
                    >
                        <Text>Don't show this again</Text>
                    </Checkbox>
                </div>
            </Flex>
        </ModalFooter>
    </ModalRoot>;
}

function ContinueButton(props: { callback: (update: () => void) => void; changes: ChangeList<string>; close: () => any; }) {
    const update = useForceUpdater();
    props.callback(update);
    return <Tooltip
        tooltipClassName="vc-newPluginsManager-restart-tooltip"
        text={<>
            The following plugins require a restart:
            <div className={Margins.bottom8} />
            <ul className="vc-newPluginsManager-restart-list">
                {props.changes.map(p => <li key={p}>{p}</li>)}
            </ul>
        </>}
        shouldShow={props.changes.hasChanges}
    >
        {tooltipProps =>
            <Button
                {...tooltipProps}
                color={Button.Colors.GREEN}
                onClick={async () => {
                    await writeKnownSettings();
                    props.changes.hasChanges ? location.reload() : props.close();
                }}
            >
                {props.changes.hasChanges ? "Restart" : "Continue"}
            </Button>
        }
    </Tooltip>;
}


function makeDependencyList(deps: string[]) {
    return (
        <React.Fragment>
            <Forms.FormText>This plugin is required by:</Forms.FormText>
            {deps.map((dep: string) => <Forms.FormText key={dep} className={cl("dep-text")}>{dep}</Forms.FormText>)}
        </React.Fragment>
    );
}

export async function openNewPluginsModal() {
    const newPlugins = await getNewPlugins();
    const newSettings = await getNewSettings();
    if ((newPlugins.size || newSettings.size) && !hasSeen) {
        hasSeen = true;
        const modalKey = openModal(modalProps => <ErrorBoundary noop onError={() => { closeModal(modalKey); }}>
            <NewPluginsModal
                modalProps={modalProps}
                newPlugins={newPlugins}
                newSettings={newSettings}
            />
        </ErrorBoundary>);
    }
}
