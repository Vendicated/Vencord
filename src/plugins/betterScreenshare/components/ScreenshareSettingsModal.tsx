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
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Card, Forms, React, Select, Slider, Text, TextInput, useEffect, useState } from "@webpack/common";

import { PluginInfo } from "../constants";
import { MediaEngineStore } from "../discordModules";
import { CodecCapabilities } from "../discordModules/modules/types";
import { defaultProfiles, pluginSettingsHelpers, usePluginSettings } from "../settings";
import { Styles } from "../styles";
import { openURL } from "../utils/utils";
import { AuthorSummaryItem } from "./AuthorSummaryItem";
import { CopyButton } from "./CopyProfileButton";
import { DeleteButton } from "./DeleteProfileButton";
import { NewProfileButton } from "./NewProfileButton";
import { SaveProfileButton } from "./SaveProfileButton";

interface SettingsCardItemProps {
    title?: string;
    children: JSX.Element[] | JSX.Element;
}

const SettingsCardItem = (props: SettingsCardItemProps & React.PropsWithChildren<{
    flexDirection?: React.CSSProperties["flexDirection"];
    style?: React.CSSProperties;
    className?: string;
} & React.HTMLProps<HTMLDivElement>>) => {
    return <Flex {...props} style={{ flexDirection: "column", gap: 0, flex: 1, ...props.style }}>
        {props.title && <Forms.FormTitle tag="h5">{props.title}</Forms.FormTitle>}
        {props.children}
    </Flex>;
};

interface SettingsCardProps {
    title?: string;
    children?: JSX.Element[] | JSX.Element;
    switchEnabled?: boolean,
    toggleable?: boolean,
    checked?: boolean,
    onChange?: (status: boolean) => void;
}

export const SettingsCard = ({ title, children, checked, onChange, toggleable, switchEnabled }: SettingsCardProps) => {
    return <Card style={Styles.infoCard}>
        <Flex style={{ height: "100%", flexDirection: "column", gap: "0.3em" }}>
            {title && <Forms.FormTitle tag="h5">{title}</Forms.FormTitle>}
            <Flex style={{ height: "100%", justifyContent: "center" }}>
                {children &&
                    <Flex style={{ height: "100%", alignItems: "flex-end", flex: 1 }}>
                        {children}
                    </Flex>
                }
                <Flex style={{ height: "100%", alignItems: "flex-end" }}>
                    {toggleable && <SettingsCardItem title="Status" style={{ flex: 0, justifyContent: "center", alignItems: "center", paddingBottom: "0.3em" }}>
                        <Switch disabled={!switchEnabled} checked={checked || false} onChange={onChange || (checked => undefined)} />
                    </SettingsCardItem>}
                </Flex>
            </Flex>
        </Flex>
    </Card>;
};

export interface ScreenshareSettingsModalProps extends ModalProps {

}

export const ScreenshareSettingsModal = ({ onClose, transitionState }: ScreenshareSettingsModalProps) => {
    const {
        currentProfile,
        profiles
    } = usePluginSettings();
    const {
        name,
        audioBitrate,
        audioBitrateEnabled,
        editable,
        framerate,
        framerateEnabled,
        height,
        keyframeInterval,
        keyframeIntervalEnabled,
        resolutionEnabled,
        videoBitrate,
        videoBitrateEnabled,
        videoCodec,
        videoCodecEnabled,
        width,
        hdrEnabled
    } = currentProfile;
    const {
        setAudioBitrate,
        setAudioBitrateEnabled,
        setVideoBitrateEnabled,
        setVideoCodec,
        setVideoCodecEnabled,
        setFramerate,
        setFramerateEnabled,
        setHeight,
        setKeyframeInterval,
        setKeyframeIntervalEnabled,
        setResolutionEnabled,
        setVideoBitrate,
        setWidth,
        setCurrentProfile,
        getProfile,
        setEditable,
        saveCurrentProfile,
        setHdrEnabled
    } = pluginSettingsHelpers;

    const validateNumberInput = (value: string) => parseInt(value) ? parseInt(value) : undefined;
    const validateTextInputNumber = (value: string) => /^[0-9\b]+$/.test(value) || value === "";

    const [videoCodecs, setVideoCodecs] = useState<CodecCapabilities[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [profileNameInput, setProfileNameInput] = useState<string>("");

    const [textinputWidth, setTextinputWidth] = useState<string>(width ? width.toString() : "");
    const [textinputHeight, setTextinputHeight] = useState<string>(height ? height.toString() : "");
    const [textinputFramerate, setTextinputFramerate] = useState<string>(framerate ? framerate.toString() : "");
    const [textinputKeyframeInterval, setTextinputKeyframeInterval] = useState<string>(keyframeInterval ? keyframeInterval.toString() : "");

    useEffect(() => {
        setTextinputWidth(width ? width.toString() : "");
        setTextinputHeight(height ? height.toString() : "");
        setTextinputFramerate(framerate ? framerate.toString() : "");
        setTextinputKeyframeInterval(keyframeInterval ? keyframeInterval.toString() : "");
    }, [width, height, framerate, keyframeInterval]);

    useEffect(() => {
        (async () => {
            const mediaEngine = MediaEngineStore.getMediaEngine();

            const stringifiedCodecs: CodecCapabilities[] = JSON.parse(
                await new Promise(res => mediaEngine.getCodecCapabilities(res))
            );

            setVideoCodecs(stringifiedCodecs);
        })();
    }, []);

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.LARGE}>
            <ModalHeader separator={false}>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Screenshare Settings</Text>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent style={{ marginBottom: 8, marginTop: 8 }}>
                <Flex flexDirection="column" style={{ gap: "1em" }}>
                    <Flex>
                        <Flex style={{ flex: 1 }}>
                            <SettingsCard title="Resolution" toggleable={true} switchEnabled={editable && !isSaving} checked={resolutionEnabled} onChange={status => setResolutionEnabled(status)}>
                                <SettingsCardItem title="Width">
                                    <TextInput disabled={!resolutionEnabled || !editable || isSaving} value={textinputWidth} onChange={value => validateTextInputNumber(value) && setTextinputWidth(value)} onBlur={e => {
                                        const result = validateNumberInput(e.target.value);
                                        setWidth(result);
                                        setTextinputWidth(result ? result.toString() : "");
                                    }} />
                                </SettingsCardItem>
                                <SettingsCardItem title="Height">
                                    <TextInput disabled={!resolutionEnabled || !editable || isSaving} value={textinputHeight} onChange={value => validateTextInputNumber(value) && setTextinputHeight(value)} onBlur={e => {
                                        const result = validateNumberInput(e.target.value);
                                        setHeight(result);
                                        setTextinputHeight(result ? result.toString() : "");
                                    }} />
                                </SettingsCardItem>
                            </SettingsCard>
                        </Flex>
                        <Flex style={{ flex: 1 }}>
                            <SettingsCard title="Framerate" toggleable={true} switchEnabled={editable && !isSaving} checked={framerateEnabled} onChange={status => setFramerateEnabled(status)}>
                                <SettingsCardItem>
                                    <TextInput disabled={!framerateEnabled || !editable || isSaving} value={textinputFramerate} onChange={value => validateTextInputNumber(value) && setTextinputFramerate(value)} onBlur={e => {
                                        const result = validateNumberInput(e.target.value);
                                        setFramerate(result);
                                        setTextinputFramerate(result ? result.toString() : "");
                                    }} />
                                </SettingsCardItem>
                            </SettingsCard>
                            <SettingsCard title="Keyframe Interval (ms)" toggleable={true} switchEnabled={editable && !isSaving} checked={keyframeIntervalEnabled} onChange={status => setKeyframeIntervalEnabled(status)}>
                                <SettingsCardItem>
                                    <TextInput disabled={!keyframeIntervalEnabled || !editable || isSaving} value={textinputKeyframeInterval} onChange={value => validateTextInputNumber(value) && setTextinputKeyframeInterval(value)} onBlur={e => {
                                        const result = validateNumberInput(e.target.value);
                                        setKeyframeInterval(result);
                                        setTextinputKeyframeInterval(result ? result.toString() : "");
                                    }} />
                                </SettingsCardItem>
                            </SettingsCard>
                        </Flex>
                    </Flex>
                    <Flex>
                        <SettingsCard title="Video Bitrate" toggleable={true} switchEnabled={editable && !isSaving} checked={videoBitrateEnabled} onChange={status => setVideoBitrateEnabled(status)}>
                            <SettingsCardItem title="Kb/s">
                                <div style={{ paddingTop: "0.3em", paddingRight: "0.4em", paddingLeft: "0.4em", boxSizing: "border-box" }}>
                                    <Slider disabled={!videoBitrateEnabled || !editable || isSaving} onValueChange={value => setVideoBitrate(value)} initialValue={videoBitrate || 500} minValue={500} maxValue={50000} markers={[500, 50000]} onValueRender={value => `${value.toFixed(0)}kb/s`} />
                                </div>
                            </SettingsCardItem>
                        </SettingsCard>
                        <SettingsCard title="Audio Bitrate" toggleable={true} switchEnabled={editable && !isSaving} checked={audioBitrateEnabled} onChange={status => setAudioBitrateEnabled(status)}>
                            <SettingsCardItem title="Kb/s">
                                <div style={{ paddingTop: "0.3em", paddingRight: "0.4em", paddingLeft: "0.4em", boxSizing: "border-box" }}>
                                    <Slider disabled={!audioBitrateEnabled || !editable || isSaving} onValueChange={value => setAudioBitrate(value)} initialValue={audioBitrate || 8} minValue={8} maxValue={320} markers={[8, 96, 320]} onValueRender={value => `${value.toFixed(0)}kb/s`} />
                                </div>
                            </SettingsCardItem>
                        </SettingsCard>
                        <SettingsCard title="Video Codec" toggleable={true} switchEnabled={editable && !isSaving} checked={videoCodecEnabled} onChange={status => setVideoCodecEnabled(status)}>
                            <SettingsCardItem>
                                <Select isDisabled={!videoCodecEnabled || !editable || isSaving} isSelected={value => value === videoCodec} options={videoCodecs.map(codecCapabilities => ({ label: codecCapabilities.codec, value: codecCapabilities.codec }))} select={value => setVideoCodec(value)} serialize={() => ""} />
                            </SettingsCardItem>
                        </SettingsCard>
                    </Flex>
                    <Flex>
                        <Flex style={{ flex: 1 }}>
                            <Card style={{ ...Styles.infoCard, flex: 0.7 }}>
                                <div>
                                    <Forms.FormTitle tag="h5">How to use?</Forms.FormTitle>
                                    <Forms.FormText>If you want to know more about the settings or possible issues, please read <a onClick={() => openURL(PluginInfo.README + "#better-screenshare-plugin")}>this</a>.</Forms.FormText>
                                </div>
                            </Card>
                            <Flex style={{ flex: 0.3 }}>
                                <SettingsCard title="Hdr" toggleable={true} switchEnabled={editable && !isSaving} checked={hdrEnabled} onChange={status => setHdrEnabled(status)}>

                                </SettingsCard>
                            </Flex>
                        </Flex>
                        <Flex style={{ flex: 1 }}>
                            <SettingsCard title="Profile">
                                <SettingsCardItem>
                                    <Flex style={{ alignItems: "center" }}>
                                        <div style={{ flex: 1 }}>
                                            {isSaving ?
                                                <TextInput
                                                    style={{ width: "100%" }}
                                                    placeholder="Insert name"
                                                    value={profileNameInput}
                                                    onChange={setProfileNameInput} /> :
                                                <Select
                                                    isSelected={value => name === value}
                                                    options={[...profiles, ...Object.values(defaultProfiles)].map(profile => ({
                                                        label: profile.name,
                                                        value: profile.name
                                                    }))}
                                                    select={value => setCurrentProfile(getProfile(value) || { name: "" })}
                                                    serialize={() => ""} />}
                                        </div>
                                        <Flex style={{ gap: "0.8em" }}>
                                            <SaveProfileButton onClick={() => {
                                                if (!isSaving) {
                                                    setIsSaving(true);
                                                } else {
                                                    if (profileNameInput.length) {
                                                        saveCurrentProfile(profileNameInput);
                                                        setCurrentProfile(getProfile(profileNameInput) || { name: "", editable: true });
                                                        setIsSaving(false);
                                                    }
                                                }
                                            }} />
                                            <NewProfileButton disabled={isSaving} />
                                            <CopyButton disabled={isSaving} />
                                            <DeleteButton disabled={isSaving} />
                                        </Flex>
                                    </Flex>
                                </SettingsCardItem>
                            </SettingsCard>
                        </Flex>
                    </Flex>
                </Flex>
            </ModalContent>
            <ModalFooter>
                <Flex style={{ width: "100%", alignItems: "center", gap: "0.6em" }}>
                    <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                        {PluginInfo.AUTHORS.length > 1 ? "Authors" : "Author"}: {...PluginInfo.AUTHORS
                            .map((author, index, array) =>
                                <>
                                    {author.github
                                        ?
                                        <a
                                            onClick={() => openURL(author.github)}
                                        >
                                            {`${author.name}`}
                                        </a>
                                        : author.name}
                                    {(index < array.length - 1) ? ", " : ""}
                                </>
                            )
                        }
                    </Text>
                    <AuthorSummaryItem />
                    <Flex style={{ marginLeft: "auto" }}>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.BRAND}
                            onClick={onClose}
                        >
                            Done
                        </Button>
                    </Flex>
                </Flex>
            </ModalFooter>
        </ModalRoot >
    );
};
