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
import { Switch } from "@components/Switch";
import { Forms } from "@webpack/common";
import { isArray } from "lodash";

import { AudioSourceSelect } from "../components/AudioSourceSelect";
import { OpenScreenshareSettingsButton } from "../components/OpenScreenshareSettingsButton";
import { getPluginSettings, pluginSettingsHelpers, usePluginSettings } from "../settings";

interface ReplacedStreamSettingsProps {
    children: JSX.Element;
}

const ReplacedStreamSettings = (props: ReplacedStreamSettingsProps) => {
    const { audioSourceEnabled } = usePluginSettings();
    const { setAudioSourceEnabled } = pluginSettingsHelpers;

    return <Flex
        flexDirection="column"
        style={{
            justifyContent: "center", alignItems: "center", width: "100%",
            ...(getPluginSettings().hideDefaultSettings ? { paddingTop: "8px" } : {})
        }}>
        {!getPluginSettings().hideDefaultSettings &&
            <div style={{ width: "100%" }}>
                {props.children}
            </div>
        }
        <Flex flexDirection="column" style={{ gap: 0, width: "100%" }}>
            <Forms.FormTitle tag="h5" style={{ margin: 0 }}>Audio Source</Forms.FormTitle>
            <Flex style={{ width: "100%" }}>
                <div style={{ width: "100%", marginTop: "auto" }}>
                    <AudioSourceSelect isDisabled={!audioSourceEnabled} />
                </div>
                <Flex flexDirection="column" style={{ gap: 0, alignItems: "center", justifyContent: "center", paddingBottom: "0.3em" }}>
                    <Forms.FormTitle tag="h5">Status</Forms.FormTitle>
                    <Switch onChange={value => setAudioSourceEnabled(value)} checked={audioSourceEnabled || false} />
                </Flex>
            </Flex>
        </Flex>
        <OpenScreenshareSettingsButton title="Advanced Settings" />
    </Flex>;
};

let replacedStreamSettingsComponent: JSX.Element | undefined;

export class PatchedFunctions {
    public patchedLocationRender(oldRender: (...args: any[]) => any, thisContext: any, functionArguments: any) {
        const renderResult = Reflect.apply(oldRender, thisContext, functionArguments);

        if (thisContext?.props?.page !== "Go Live Modal") return renderResult;

        const oldChildren = renderResult.props.children;

        renderResult.props.children = (props: any) => {
            const oldChildrenResult = oldChildren(props);

            switch (oldChildrenResult.props.value.location.section) {
                case "Stream Settings":
                    const streamSettingsModalContent =
                        oldChildrenResult.props.children;

                    if (!replacedStreamSettingsComponent) {
                        const oldStreamSettingsComponent = streamSettingsModalContent.props.children.props.children;

                        replacedStreamSettingsComponent =
                            <ReplacedStreamSettings>
                                {isArray(oldStreamSettingsComponent) ? [...oldStreamSettingsComponent] : { ...oldStreamSettingsComponent }}
                            </ReplacedStreamSettings>;
                    }

                    streamSettingsModalContent.props.title = "Stream Settings";
                    streamSettingsModalContent.props.children.props.children = replacedStreamSettingsComponent;
                    break;
                default:
                    break;
            }

            return oldChildrenResult;
        };
        return renderResult;
    }

}
