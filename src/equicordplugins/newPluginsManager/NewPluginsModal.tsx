/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { PluginCard } from "@components/PluginSettings";
import { ChangeList } from "@utils/ChangeList";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Alerts, Button, Flex, Forms, Parser, React, Text, Tooltip, useMemo } from "@webpack/common";
import { JSX } from "react";

import Plugins from "~plugins";

import { getNewPlugins, writeKnownPlugins } from "./knownPlugins";

const cl = classNameFactory("vc-plugins-");

let hasSeen = false;

// Most of this was stolen from PluginSettings directly.

export function NewPluginsModal({ modalProps, newPlugins }: { modalProps: ModalProps; newPlugins: Set<string>; }) {
    const settings = useSettings();
    const changes = React.useMemo(() => new ChangeList<string>(), []);

    React.useEffect(() => {
        return () => void (changes.hasChanges && Alerts.show({
            title: "Restart required",
            body: (
                <>
                    <p>The following plugins require a restart:</p>
                    <div>{changes.map((s, i) => (
                        <>
                            {i > 0 && ", "}
                            {Parser.parse("`" + s + "`")}
                        </>
                    ))}</div>
                </>
            ),
            confirmText: "Restart now",
            cancelText: "Later!",
            onConfirm: () => location.reload()
        }));
    }, []);

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

    const sortedPlugins = useMemo(() => [...newPlugins].map(pn => Plugins[pn])
        .sort((a, b) => a.name.localeCompare(b.name)), []);

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
                            onRestartNeeded={name => changes.handleChange(name)}
                            disabled={true}
                            plugin={p}
                            key={p.name}
                        />
                    )}
                </Tooltip>
            );
        } else {
            plugins.push(
                <PluginCard
                    onRestartNeeded={name => changes.handleChange(name)}
                    disabled={false}
                    plugin={p}
                    key={p.name}
                />
            );
        }
    }


    return <ModalRoot {...modalProps} size={ModalSize.MEDIUM} >
        <ModalHeader>
            <Text variant="heading-lg/semibold">New Plugins ({[...plugins, ...requiredPlugins].length})</Text>
        </ModalHeader>
        <ModalContent>
            <div className={cl("grid")}>
                {[...plugins, ...requiredPlugins]}
            </div>
        </ModalContent>
        <ModalFooter>
            <Flex direction={Flex.Direction.HORIZONTAL_REVERSE}>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={async () => {
                        await writeKnownPlugins();
                        modalProps.onClose();
                    }}
                >
                    Continue
                </Button>
            </Flex>
        </ModalFooter>
    </ModalRoot>;
}


function makeDependencyList(deps: string[]) {
    return (
        <React.Fragment>
            <Forms.FormText>This plugin is required by:</Forms.FormText>
            {deps.map((dep: string) => <Forms.FormText key={cl("dep-text")} className={cl("dep-text")}>{dep}</Forms.FormText>)}
        </React.Fragment>
    );
}

export async function openNewPluginsModal() {
    const newPlugins = await getNewPlugins();
    if (newPlugins.size && !hasSeen) {
        hasSeen = true;
        openModal(modalProps => (
            <NewPluginsModal
                modalProps={modalProps}
                newPlugins={newPlugins}
            />
        ));
    }
}
