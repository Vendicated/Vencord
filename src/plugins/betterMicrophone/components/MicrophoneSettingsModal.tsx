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
import { ModalSize } from "@utils/modal";
import { Card, Forms, Select, Slider, TextInput, useEffect, useState } from "@webpack/common";
import { SelectOption } from "@webpack/types";

import {
    ProfilableStore,
    SettingsModal,
    SettingsModalCard,
    SettingsModalCardItem,
    SettingsModalCardRow,
    SettingsModalProfilesCard,
    validateNumberInput,
    validateTextInputNumber
} from "../../philsPluginLibrary";
import { Styles } from "../../philsPluginLibrary/styles";
import { MicrophoneProfile, MicrophoneStore } from "../stores";

const simpleVoiceBitrates: readonly SelectOption[] = [
    {
        label: "Normal",
        value: 96
    },
    {
        label: "Medium-High",
        value: 160
    },
    {
        label: "High",
        value: 320
    }
] as const;

export interface MicrophoneSettingsModalProps extends React.ComponentProps<typeof SettingsModal> {
    microphoneStore: ProfilableStore<MicrophoneStore, MicrophoneProfile>;
    showInfo?: boolean;
}

export const MicrophoneSettingsModal = (props: MicrophoneSettingsModalProps) => {
    const { microphoneStore, showInfo } = props;

    const {
        currentProfile,
        simpleMode,
        setSimpleMode,
        deleteProfile,
        duplicateProfile,
        getCurrentProfile,
        getDefaultProfiles,
        getProfile,
        getProfiles,
        isCurrentProfileADefaultProfile,
        profiles,
        saveProfile,
        setChannels,
        setChannelsEnabled,
        setCurrentProfile,
        setFreq,
        setFreqEnabled,
        setPacsize,
        setPacsizeEnabled,
        setRate,
        setRateEnabled,
        setVoiceBitrate,
        setVoiceBitrateEnabled
    } = microphoneStore.use();

    const {
        name,
        channels,
        channelsEnabled,
        freq,
        freqEnabled,
        pacsize,
        pacsizeEnabled,
        rate,
        rateEnabled,
        voiceBitrate,
        voiceBitrateEnabled
    } = currentProfile;

    const [isSaving, setIsSaving] = useState(false);

    const [rateInput, setRateInput] = useState<string>(rate ? rate.toString() : "");
    const [freqInput, setFreqInput] = useState<string>(freq ? freq.toString() : "");
    const [pacsizeInput, setPacsizeInput] = useState<string>(pacsize ? pacsize.toString() : "");
    const [channelsInput, setChannelsInput] = useState<string>(channels ? channels.toString() : "");

    useEffect(() => {
        setRateInput(rate ? rate.toString() : "");
        setFreqInput(freq ? freq.toString() : "");
        setPacsizeInput(pacsize ? pacsize.toString() : "");
        setChannelsInput(channels ? channels.toString() : "");
    }, [rate, freq, pacsize, channels]);

    const simpleToggle =
        <Flex style={{ justifyContent: "center", alignItems: "center", gap: "0.6em" }}>
            <Forms.FormTitle style={{ margin: 0 }} tag="h5">Simple</Forms.FormTitle>
            <Switch checked={simpleMode ?? false} disabled={isSaving} onChange={checked => setSimpleMode(checked)} />
        </Flex>;

    const settingsCardVoiceBitrateSimple =
        <SettingsModalCard
            title="Audio Bitrate"
            switchEnabled
            flex={0.8}
            switchProps={{
                checked: voiceBitrateEnabled ?? false,
                disabled: isSaving,
                onChange: status => setVoiceBitrateEnabled(status)
            }}>
            <SettingsModalCardItem>
                <Select
                    isDisabled={!voiceBitrateEnabled || isSaving}
                    options={simpleVoiceBitrates}
                    select={(value: number) => setVoiceBitrate(value)}
                    isSelected={(value: number) => value === voiceBitrate}
                    serialize={() => ""} />
            </SettingsModalCardItem>
        </SettingsModalCard>;

    const settingsCardChannelsSimple =
        <SettingsModalCard
            title="Stereo"
            flex={0.2}
            switchEnabled
            switchProps={{
                checked: (channelsEnabled && channels === 2) ?? false,
                disabled: isSaving,
                onChange: status => void setChannelsEnabled(status) ?? setChannels(2)
            }}>
        </SettingsModalCard>;

    const settingsCardVoiceBitrate =
        <SettingsModalCard
            title="Audio Bitrate"
            switchEnabled
            flex={0.4}
            switchProps={{
                checked: voiceBitrateEnabled ?? false,
                disabled: isSaving,
                onChange: status => setVoiceBitrateEnabled(status)
            }}>
            <SettingsModalCardItem title="Kb/s">
                <div style={{ paddingTop: "0.3em", paddingRight: "0.4em", paddingLeft: "0.4em", boxSizing: "border-box" }}>
                    <Slider
                        disabled={!voiceBitrateEnabled || isSaving}
                        onValueChange={value => setVoiceBitrate(value)}
                        initialValue={voiceBitrate || 8}
                        minValue={8}
                        maxValue={320}
                        markers={[8, 96, 320]}
                        onValueRender={value => `${value.toFixed(0)}kb/s`} />
                </div>
            </SettingsModalCardItem>
        </SettingsModalCard>;

    const settingsCardRate =
        <SettingsModalCard
            title="Sample Rate"
            switchEnabled
            switchProps={{
                checked: rateEnabled ?? false,
                disabled: isSaving,
                onChange: status => setRateEnabled(status)
            }}>
            <SettingsModalCardItem>
                <TextInput
                    disabled={!rateEnabled || isSaving}
                    value={rateInput}
                    onChange={value => validateTextInputNumber(value) && setRateInput(value)}
                    onBlur={e => {
                        const result = validateNumberInput(e.target.value);
                        setRate(result);
                        setRateInput(result ? result.toString() : "");
                    }} />
            </SettingsModalCardItem>
        </SettingsModalCard>;

    const settingsCardFreq =
        <SettingsModalCard
            title="Sample Frequency"
            switchEnabled
            switchProps={{
                checked: freqEnabled ?? false,
                disabled: isSaving,
                onChange: status => setFreqEnabled(status)
            }}>
            <SettingsModalCardItem>
                <TextInput
                    disabled={!freqEnabled || isSaving}
                    value={freqInput}
                    onChange={value => validateTextInputNumber(value) && setFreqInput(value)}
                    onBlur={e => {
                        const result = validateNumberInput(e.target.value);
                        setFreq(result);
                        setFreqInput(result ? result.toString() : "");
                    }} />
            </SettingsModalCardItem>
        </SettingsModalCard>;

    const settingsCardPacsize =
        <SettingsModalCard
            title="Pac Size"
            switchEnabled
            switchProps={{
                checked: pacsizeEnabled ?? false,
                disabled: isSaving,
                onChange: status => setPacsizeEnabled(status)
            }}>
            <SettingsModalCardItem>
                <TextInput
                    disabled={!pacsizeEnabled || isSaving}
                    value={pacsizeInput}
                    onChange={value => validateTextInputNumber(value) && setPacsizeInput(value)}
                    onBlur={e => {
                        const result = validateNumberInput(e.target.value);
                        setPacsize(result);
                        setPacsizeInput(result ? result.toString() : "");
                    }} />
            </SettingsModalCardItem>
        </SettingsModalCard>;

    const settingsCardChannels =
        <SettingsModalCard
            title="Channels"
            switchEnabled
            switchProps={{
                checked: channelsEnabled ?? false,
                disabled: isSaving,
                onChange: status => setChannelsEnabled(status)
            }}>
            <SettingsModalCardItem>
                <TextInput
                    disabled={!channelsEnabled || isSaving}
                    value={channelsInput}
                    onChange={value => validateTextInputNumber(value) && setChannelsInput(value)}
                    onBlur={e => {
                        const result = validateNumberInput(e.target.value);
                        setChannels(result);
                        setChannelsInput(result ? result.toString() : "");
                    }} />
            </SettingsModalCardItem>
        </SettingsModalCard>;

    const settingsCardProfiles =
        <SettingsModalProfilesCard
            flex={0.6}
            onSaveStateChanged={state => setIsSaving(state)}
            profileableStore={microphoneStore} />;

    const infoCard =
        <Card style={{ ...Styles.infoCard }}>
            <Forms.FormTitle tag="h5">Important</Forms.FormTitle>
            <Forms.FormText>
                To take full advantage of this plugin, please disable <span style={{ fontWeight: "bold" }}>Krisp</span> and <span style={{ fontWeight: "bold" }}>Echo Cancellation</span>, otherwise features like Stereo (Channels) will not work.
            </Forms.FormText>
        </Card>;

    return (
        <SettingsModal
            size={simpleMode ? ModalSize.DYNAMIC : ModalSize.DYNAMIC}
            title="Microphone Settings"
            closeButtonName="Apply"
            footerContent={
                <Flex style={{ justifyContent: "center", alignItems: "center", marginLeft: "auto" }}>
                    {simpleToggle}
                </Flex>
            }
            {...props}
            onDone={() => {
                props.onClose();
                props.onDone && props.onDone();
            }}
        >
            {simpleMode
                ? <div style={{ width: "30em", display: "flex", flexDirection: "column", gap: "1em" }}>
                    <SettingsModalCardRow>
                        {settingsCardVoiceBitrateSimple}
                        {settingsCardChannelsSimple}
                    </SettingsModalCardRow>
                    {showInfo &&
                        <SettingsModalCardRow>
                            {infoCard}
                        </SettingsModalCardRow>
                    }
                </div>
                : <div style={{ display: "flex", flexDirection: "column", width: "50em", gap: "1em", maxHeight: "30em" }}>
                    <SettingsModalCardRow>
                        {settingsCardFreq}
                        {settingsCardRate}
                        {settingsCardPacsize}
                        {settingsCardChannels}
                    </SettingsModalCardRow>
                    <SettingsModalCardRow>
                        {settingsCardVoiceBitrate}
                        {settingsCardProfiles}
                    </SettingsModalCardRow>
                    {showInfo &&
                        <SettingsModalCardRow>
                            {infoCard}
                        </SettingsModalCardRow>
                    }
                </div>
            }
        </SettingsModal>
    );
};
