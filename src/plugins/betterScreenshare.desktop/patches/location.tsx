/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { Flex } from "@components/Flex";
import { React } from "@webpack/common";
import { Settings } from "Vencord";

import { SettingsModalCard, SettingsModalCardItem } from "../../philsPluginLibrary";
import { AudioSourceSelect, OpenScreenshareSettingsButton } from "../components";
import { PluginInfo } from "../constants";
import { screenshareStore } from "../stores";

interface ReplacedStreamSettingsProps {
    children: React.ComponentProps<"div">["children"];
}

export const ReplacedStreamSettings = ({ children }: ReplacedStreamSettingsProps) => {
    const { use } = screenshareStore;

    const { audioSourceEnabled, setAudioSourceEnabled } = use();
    const { hideDefaultSettings } = Settings.plugins[PluginInfo.PLUGIN_NAME];

    const cardProps = { style: { border: "1px solid var(--primary-800)" } };

    return (
        <div style={{ margin: "1em", display: "flex", flexDirection: "column", gap: "1em" }}>
            <SettingsModalCard cardProps={cardProps} title="Stream Settings">
                <SettingsModalCardItem>
                    <Flex flexDirection="column">
                        {!hideDefaultSettings && children}
                        <OpenScreenshareSettingsButton title="Advanced Settings" />
                    </Flex>
                </SettingsModalCardItem>
            </SettingsModalCard>
            <SettingsModalCard
                cardProps={cardProps}
                switchEnabled
                switchProps={{
                    checked: audioSourceEnabled ?? false,
                    onChange: status => setAudioSourceEnabled(status)
                }}
                title="Audio Source">
                <SettingsModalCardItem>
                    <AudioSourceSelect isDisabled={!audioSourceEnabled} />
                </SettingsModalCardItem>
            </SettingsModalCard>
        </div>
    );
};

let replacedStreamSettingsComponent: JSX.Element | undefined;

export function replacedLocationRender(oldRender: (...args: any[]) => any, thisContext: any, functionArguments: any) {
    console.warn(functionArguments);

    const renderResult = Reflect.apply(oldRender, thisContext, functionArguments);

    if (thisContext?.props?.page !== "Go Live Modal") return renderResult;

    const oldChildren = renderResult.props.children;

    renderResult.props.children = (props: any) => {
        const oldChildrenResult = oldChildren(props);

        console.warn(oldChildrenResult, "oldChildrenResult");

        switch (oldChildrenResult.props.value.location.section) {
            case "Stream Settings":
                const streamSettingsModalContent =
                    oldChildrenResult.props.children;

                if (!replacedStreamSettingsComponent) {
                    const oldStreamSettingsComponent = streamSettingsModalContent.props.children.props.children;

                    replacedStreamSettingsComponent =
                        <ReplacedStreamSettings>
                            <div>{Array.isArray(oldStreamSettingsComponent) ? [...oldStreamSettingsComponent] : { ...oldStreamSettingsComponent }}</div>
                        </ReplacedStreamSettings>;
                }

                oldChildrenResult.props.children = replacedStreamSettingsComponent;
                break;
            default:
                break;
        }

        return oldChildrenResult;
    };
    return renderResult;
}
