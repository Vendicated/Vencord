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
import Plugin from "..";
import { AudioSourceSelect, OpenScreenshareSettingsButton } from "../components";
import { PluginInfo } from "../constants";
import { screenshareStore } from "../stores";

const ReplacedStreamSettings = () => {
    const { use } = screenshareStore;

    const { audioSourceEnabled, setAudioSourceEnabled } = use();

    const cardProps = { style: { border: "1px solid var(--primary-800)" } };

    return (
        <div style={{ margin: "1em", display: "flex", flexDirection: "column", gap: "1em" }}>
            <SettingsModalCard cardProps={cardProps} title="Stream Settings">
                <SettingsModalCardItem>
                    <Flex flexDirection="column">
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

export function replacedScreenshareModalSettingsContentType(oldType: (...args: any[]) => any, thisContext: any, functionArguments: any) {
    const { hideDefaultSettings } = Settings.plugins[PluginInfo.PLUGIN_NAME];
    const oldTypeResult = Reflect.apply(oldType, thisContext, functionArguments);

    if (hideDefaultSettings)
        oldTypeResult.props.children = oldTypeResult.props.children.filter(c => !c?.props.selectedFPS);
    oldTypeResult.props.children.push(<ReplacedStreamSettings />);

    return oldTypeResult;
}

export function replacedScreenshareModalComponent(oldComponent: (...args: any[]) => any, thisContext: any, functionArguments: any) {
    const oldComponentResult = Reflect.apply(oldComponent, thisContext, functionArguments);

    const content = oldComponentResult.props.children.props.children[2].props.children[1].props.children[2].props.children.props.children;
    const oldContentType = content.type;

    content.type = function () {
        return replacedScreenshareModalSettingsContentType(oldContentType, this, arguments);
    };

    const [submitBtn, cancelBtn] = oldComponentResult.props.children.props.children[2].props.children[2].props.children;

    submitBtn.props.onClick = () => {
        const { screensharePatcher, screenshareAudioPatcher } = Plugin;

        if (screensharePatcher) {
            screensharePatcher.forceUpdateTransportationOptions();
            if (screensharePatcher.connection?.connectionState === "CONNECTED")
                screensharePatcher.forceUpdateDesktopSourceOptions();
        }

        if (screenshareAudioPatcher)
            screenshareAudioPatcher.forceUpdateTransportationOptions();
    };

    return oldComponentResult;
}
