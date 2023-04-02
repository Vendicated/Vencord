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
import { SelectOption } from "@webpack/types";

import { PluginInfo } from "../constants";
import { MediaEngineStore } from "../discordModules";
import { CodecCapabilities } from "../discordModules/modules/types";
import { defaultProfiles, pluginSettingsHelpers, usePluginSettings } from "../settings";
import { Styles } from "../styles";
import { Resolution } from "../types";
import { openURL } from "../utils";
import { AuthorSummaryItem, CopyButton, DeleteButton, NewButton, SaveButton } from "./";

export interface SettingsCardItemProps {
    title?: string;
}

export const SettingsCardItem = (props: SettingsCardItemProps & React.PropsWithChildren<React.HTMLProps<HTMLDivElement>>) => {
    return (
        <Flex flexDirection="column" {...props} style={{ gap: 0, flex: 1, ...props.style }}>
            {props.title && <Forms.FormTitle tag="h5">{props.title}</Forms.FormTitle>}
            {props.children}
        </Flex>
    );
};

export interface SettingsCardProps {
    title?: string;
    children?: JSX.Element[] | JSX.Element;
    switchEnabled?: boolean,
    toggleable?: boolean,
    checked?: boolean,
    onChange?: (status: boolean) => void;
}

export const SettingsCard = ({ title, children, checked, onChange, toggleable, switchEnabled }: SettingsCardProps) => {
    return (
        <Card style={Styles.infoCard}>
            <Flex flexDirection="column" style={{ height: "100%", gap: "0.3em" }}>
                {title && <Forms.FormTitle tag="h5">{title}</Forms.FormTitle>}
                <Flex style={{ height: "100%", justifyContent: "center" }}>
                    {children &&
                        <Flex style={{ height: "100%", alignItems: "flex-end", flex: 1 }}>
                            {children}
                        </Flex>
                    }
                    <Flex style={{ height: "100%", alignItems: "flex-end" }}>
                        {toggleable &&
                            <SettingsCardItem
                                title="Status"
                                style={{ flex: 0, justifyContent: "center", alignItems: "center", paddingBottom: "0.3em" }}>
                                <Switch
                                    disabled={!switchEnabled}
                                    checked={checked || false}
                                    onChange={onChange || (checked => undefined)} />
                            </SettingsCardItem>
                        }
                    </Flex>
                </Flex>
            </Flex>
        </Card>
    );
};

export interface ScreenshareSettingsModalProps extends ModalProps {

}

export const ScreenshareSettingsModal = ({ onClose, transitionState }: ScreenshareSettingsModalProps) => {
    const {
        currentProfile,
        profiles,
        simpleMode,
    } = usePluginSettings();

    const {
        name,
        audioBitrate,
        audioBitrateEnabled,
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
        saveCurrentProfile,
        setHdrEnabled,
        setSimpleMode,
        deleteProfile
    } = pluginSettingsHelpers;

    const onSaveProfile = () => {
        if (!isSaving) {
            setIsSaving(true);
        } else {
            if (profileNameInput.length && !Object.values(defaultProfiles).some(value => value.name === profileNameInput)) {
                saveCurrentProfile(profileNameInput);
                setCurrentProfile(getProfile(profileNameInput) || { name: "" });
                setIsSaving(false);
            }
        }
    };

    const onCopyProfile = () => {
        setCurrentProfile({ ...currentProfile, name: "" });
    };

    const onNewProfile = () => {
        setCurrentProfile({ name: "" });
    };

    const onDeleteProfile = () => {
        deleteProfile(currentProfile);
    };

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

    const simpleResolutions: readonly SelectOption[] = [
        {
            label: "480p",
            value: {
                height: 480,
                width: 720
            } satisfies Resolution
        },
        {
            label: "720p",
            value: {
                height: 720,
                width: 1280
            } satisfies Resolution
        },
        {
            label: "1080p",
            value: {
                height: 1080,
                width: 1920
            } satisfies Resolution
        },
        {
            label: "1440p",
            value: {
                height: 1440,
                width: 2560
            } satisfies Resolution
        },
        {
            label: "2160p",
            value: {
                height: 2160,
                width: 3840
            } satisfies Resolution
        }
    ] as const;

    const simpleVideoBitrates: readonly SelectOption[] = [
        {
            label: "Low",
            value: 2500
        },
        {
            label: "Medium",
            value: 5000
        },
        {
            label: "Medium-High",
            value: 7500
        },
        {
            label: "High",
            value: 1000
        }
    ] as const;

    const settingsCardResolutionSimple =
        <SettingsCard
            title="Resolution"
            toggleable={true}
            switchEnabled={!isSaving}
            checked={resolutionEnabled}
            onChange={status => setResolutionEnabled(status)}>
            <SettingsCardItem>
                <Select
                    isDisabled={!resolutionEnabled || isSaving}
                    options={simpleResolutions}
                    select={(value: Resolution) => void setWidth(value.width) ?? setHeight(value.height)}
                    isSelected={(value: Resolution) => width === value.width && height === value.height}
                    serialize={() => ""} />
            </SettingsCardItem>
        </SettingsCard>;

    const settingsCardVideoBitrateSimple =
        <SettingsCard
            title="Video Bitrate"
            toggleable={true}
            switchEnabled={!isSaving}
            checked={videoBitrateEnabled}
            onChange={status => setVideoBitrateEnabled(status)}>
            <SettingsCardItem>
                <Select
                    isDisabled={!videoBitrateEnabled || isSaving}
                    options={simpleVideoBitrates}
                    select={(value: number) => void setVideoBitrate(value)}
                    isSelected={(value: number) => videoBitrate === value}
                    serialize={() => ""} />
            </SettingsCardItem>
        </SettingsCard>;

    const settingsCardResolution =
        <SettingsCard
            title="Resolution"
            toggleable={true}
            switchEnabled={!isSaving}
            checked={resolutionEnabled}
            onChange={status => setResolutionEnabled(status)}>
            <SettingsCardItem title="Width">
                <TextInput
                    disabled={!resolutionEnabled || isSaving}
                    value={textinputWidth}
                    onChange={value => validateTextInputNumber(value) && setTextinputWidth(value)}
                    onBlur={e => {
                        const result = validateNumberInput(e.target.value);
                        setWidth(result);
                        setTextinputWidth(result ? result.toString() : "");
                    }} />
            </SettingsCardItem>
            <SettingsCardItem title="Height">
                <TextInput
                    disabled={!resolutionEnabled || isSaving}
                    value={textinputHeight}
                    onChange={value => validateTextInputNumber(value) && setTextinputHeight(value)}
                    onBlur={e => {
                        const result = validateNumberInput(e.target.value);
                        setHeight(result);
                        setTextinputHeight(result ? result.toString() : "");
                    }} />
            </SettingsCardItem>
        </SettingsCard>;

    const settingsCardFramerate =
        <SettingsCard
            title="Framerate"
            toggleable={true}
            switchEnabled={!isSaving}
            checked={framerateEnabled}
            onChange={status => setFramerateEnabled(status)}>
            <SettingsCardItem>
                <TextInput
                    disabled={!framerateEnabled || isSaving}
                    value={textinputFramerate}
                    onChange={value => validateTextInputNumber(value) && setTextinputFramerate(value)}
                    onBlur={e => {
                        const result = validateNumberInput(e.target.value);
                        setFramerate(result);
                        setTextinputFramerate(result ? result.toString() : "");
                    }} />
            </SettingsCardItem>
        </SettingsCard>;

    const settingsCardKeyframeInterval =
        <SettingsCard
            title="Keyframe Interval (ms)"
            toggleable={true}
            switchEnabled={!isSaving}
            checked={keyframeIntervalEnabled}
            onChange={status => setKeyframeIntervalEnabled(status)}>
            <SettingsCardItem>
                <TextInput
                    disabled={!keyframeIntervalEnabled || isSaving}
                    value={textinputKeyframeInterval}
                    onChange={value => validateTextInputNumber(value) && setTextinputKeyframeInterval(value)}
                    onBlur={e => {
                        const result = validateNumberInput(e.target.value);
                        setKeyframeInterval(result);
                        setTextinputKeyframeInterval(result ? result.toString() : "");
                    }} />
            </SettingsCardItem>
        </SettingsCard>;

    const settingsCardVideoBitrate =
        <SettingsCard
            title="Video Bitrate"
            toggleable={true}
            switchEnabled={!isSaving}
            checked={videoBitrateEnabled}
            onChange={status => setVideoBitrateEnabled(status)}>
            <SettingsCardItem title="Kb/s">
                <div style={{ paddingTop: "0.3em", paddingRight: "0.4em", paddingLeft: "0.4em", boxSizing: "border-box" }}>
                    <Slider
                        disabled={!videoBitrateEnabled || isSaving}
                        onValueChange={value => setVideoBitrate(value)}
                        initialValue={videoBitrate || 500}
                        minValue={500}
                        maxValue={10000}
                        markers={[500, 10000]}
                        onValueRender={value => `${value.toFixed(0)}kb/s`} />
                </div>
            </SettingsCardItem>
        </SettingsCard>;

    const settingsCardAudioBitrate =
        <SettingsCard
            title="Audio Bitrate"
            toggleable={true}
            switchEnabled={!isSaving}
            checked={audioBitrateEnabled}
            onChange={status => setAudioBitrateEnabled(status)}>
            <SettingsCardItem title="Kb/s">
                <div style={{ paddingTop: "0.3em", paddingRight: "0.4em", paddingLeft: "0.4em", boxSizing: "border-box" }}>
                    <Slider
                        disabled={!audioBitrateEnabled || isSaving}
                        onValueChange={value => setAudioBitrate(value)}
                        initialValue={audioBitrate || 8}
                        minValue={8}
                        maxValue={320}
                        markers={[8, 96, 320]}
                        onValueRender={value => `${value.toFixed(0)}kb/s`} />
                </div>
            </SettingsCardItem>
        </SettingsCard>;

    const settingsCardVideoCodec =
        <SettingsCard
            title="Video Codec"
            toggleable={true}
            switchEnabled={!isSaving}
            checked={videoCodecEnabled}
            onChange={status => setVideoCodecEnabled(status)}>
            <SettingsCardItem>
                <Select
                    isDisabled={!videoCodecEnabled || isSaving}
                    isSelected={value => value === videoCodec}
                    options={videoCodecs.map(codecCapabilities => ({ label: codecCapabilities.codec, value: codecCapabilities.codec }))}
                    select={value => setVideoCodec(value)}
                    serialize={() => ""} />
            </SettingsCardItem>
        </SettingsCard>;

    const settingsCardHdr =
        <SettingsCard
            title="Hdr"
            toggleable={true}
            switchEnabled={!isSaving}
            checked={hdrEnabled}
            onChange={status => setHdrEnabled(status)} />;

    const cardGuide =
        <Card style={{ ...Styles.infoCard, flex: 0.7 }}>
            <div>
                <Forms.FormTitle tag="h5">How to use?</Forms.FormTitle>
                <Forms.FormText>If you want to know more about the settings or possible issues, please read <a onClick={() => openURL(PluginInfo.README + "#better-screenshare-plugin")}>this</a>.</Forms.FormText>
            </div>
        </Card>;

    const settingsCardProfile =
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
                        <SaveButton onClick={onSaveProfile} />
                        <NewButton onClick={onNewProfile} disabled={isSaving} />
                        <CopyButton onClick={onCopyProfile} disabled={isSaving} />
                        <DeleteButton onClick={onDeleteProfile} disabled={isSaving} />
                    </Flex>
                </Flex>
            </SettingsCardItem>
        </SettingsCard>;

    return (
        <ModalRoot transitionState={transitionState} size={simpleMode ? ModalSize.SMALL : ModalSize.LARGE}>
            <ModalHeader separator={false}>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Screenshare Settings</Text>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent style={{ marginBottom: 8, marginTop: 8 }}>
                {simpleMode ?
                    <Flex flexDirection="column" >
                        {settingsCardResolutionSimple}
                        {settingsCardFramerate}
                        {settingsCardVideoBitrateSimple}
                    </Flex> :
                    <Flex flexDirection="column" >
                        <Flex>
                            <Flex style={{ flex: 1 }}>
                                {settingsCardResolution}
                            </Flex>
                            <Flex style={{ flex: 1 }}>
                                {settingsCardFramerate}
                                {settingsCardKeyframeInterval}
                            </Flex>
                        </Flex>
                        <Flex>
                            {settingsCardVideoBitrate}
                            {settingsCardAudioBitrate}
                            {settingsCardVideoCodec}
                        </Flex>
                        <Flex>
                            <Flex style={{ flex: 1 }}>
                                {cardGuide}
                                <Flex style={{ flex: 0.3 }}>
                                    {settingsCardHdr}
                                </Flex>
                            </Flex>
                            <Flex style={{ flex: 1 }}>
                                {settingsCardProfile}
                            </Flex>
                        </Flex>
                    </Flex>}
            </ModalContent>
            <ModalFooter>
                <Flex style={{ width: "100%", alignItems: "center", gap: "0.6em" }}>
                    <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                        {PluginInfo.AUTHORS.length > 1 ? "Authors" : "Author"}: {
                            ...PluginInfo.AUTHORS
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
                        <Flex>
                            <Flex style={{ justifyContent: "center", alignItems: "center", gap: "0.6em" }}>
                                <Forms.FormTitle style={{ margin: 0 }} tag="h5">Simple</Forms.FormTitle>
                                <Switch checked={!!simpleMode} disabled={isSaving} onChange={checked => setSimpleMode(checked)} />
                            </Flex>
                            <Button
                                size={Button.Sizes.SMALL}
                                color={Button.Colors.BRAND}
                                onClick={onClose}
                            >
                                Done
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            </ModalFooter>
        </ModalRoot >
    );
};
