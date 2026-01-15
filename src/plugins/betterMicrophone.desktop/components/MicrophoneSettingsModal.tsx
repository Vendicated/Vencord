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
import { SelectOption } from "@vencord/discord-types";
import { Card, Forms, Select, Slider, TextInput, useEffect, useState } from "@webpack/common";

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
    },
    {
        label: "Very-High",
        value: 512
    },
    {
        label: "Maximum",
        value: 24576
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
        setVoiceBitrateEnabled,
        setEnableEffects,
        setMasterGain,
        setEqEnabled,
        setEqLowFreq,
        setEqLowGain,
        setEqLowMidFreq,
        setEqLowMidGain,
        setEqMidFreq,
        setEqMidGain,
        setEqHighMidFreq,
        setEqHighMidGain,
        setEqHighFreq,
        setEqHighGain,
        setCompEnabled,
        setCompThreshold,
        setCompRatio,
        setCompAttack,
        setCompRelease,
        setCompKnee,
        setReverbEnabled,
        setReverbSeconds,
        setReverbDecay,
        setEchoCancellation,
        setNoiseSuppression,
        setAutoGainControl,
        setForceStereo,
        setPreferredSampleRate
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
        voiceBitrateEnabled,
        enableEffects,
        masterGain,
        eqEnabled,
        eqLowFreq,
        eqLowGain,
        eqLowMidFreq,
        eqLowMidGain,
        eqMidFreq,
        eqMidGain,
        eqHighMidFreq,
        eqHighMidGain,
        eqHighFreq,
        eqHighGain,
        compEnabled,
        compThreshold,
        compRatio,
        compAttack,
        compRelease,
        compKnee,
        reverbEnabled,
        reverbSeconds,
        reverbDecay,
        echoCancellation,
        noiseSuppression,
        autoGainControl,
        forceStereo,
        preferredSampleRate
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
                onChange: status => {
                    setChannelsEnabled(status);
                    setChannels(2);
                }
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
                <div style={{ paddingTop: "0.3em", paddingRight: "0.4em", paddingLeft: "0.4em", boxSizing: "border-box", position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5em", fontSize: "12px", color: "var(--text-muted)" }}>
                        <span style={{ minWidth: "40px", textAlign: "left" }}>8</span>
                        <span style={{ minWidth: "40px", textAlign: "right" }}>24576</span>
                    </div>
                    <Slider
                        disabled={!voiceBitrateEnabled || isSaving}
                        onValueChange={value => setVoiceBitrate(value)}
                        initialValue={voiceBitrate || 8}
                        minValue={8}
                        maxValue={24576}
                        markers={[8, 96, 320, 512, 24576]}
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


    const settingsCardVoiceEffects =
        <SettingsModalCard
            title=" rz Studio"
            switchEnabled
            flex={1}
            switchProps={{
                checked: enableEffects ?? false,
                disabled: isSaving,
                onChange: status => setEnableEffects(status)
            }}>
            <SettingsModalCardItem title="Master Gain">
                <div style={{ paddingTop: "0.3em", paddingRight: "0.4em", paddingLeft: "0.4em", boxSizing: "border-box" }}>
                    <Slider
                        disabled={!enableEffects || isSaving}
                        onValueChange={value => setMasterGain(value)}
                        initialValue={masterGain || 1.0}
                        minValue={0}
                        maxValue={2}
                        markers={[0, 0.5, 1.0, 1.5, 2.0]}
                        onValueRender={value => `${(value * 100).toFixed(0)}%`} />
                </div>
            </SettingsModalCardItem>
        </SettingsModalCard>;

    const settingsCardEQ =
        <SettingsModalCard
            title=" Equalizer"
            switchEnabled
            flex={1}
            switchProps={{
                checked: eqEnabled ?? false,
                disabled: isSaving,
                onChange: status => setEqEnabled(status)
            }}>
            <SettingsModalCardItem title="5-Band EQ">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginTop: "8px" }}>
                    {[
                        { key: "Low", freq: eqLowFreq || 80, gain: eqLowGain || 0, setFreq: setEqLowFreq, setGain: setEqLowGain },
                        { key: "L-Mid", freq: eqLowMidFreq || 500, gain: eqLowMidGain || 0, setFreq: setEqLowMidFreq, setGain: setEqLowMidGain },
                        { key: "Mid", freq: eqMidFreq || 2000, gain: eqMidGain || 0, setFreq: setEqMidFreq, setGain: setEqMidGain },
                        { key: "H-Mid", freq: eqHighMidFreq || 5000, gain: eqHighMidGain || 0, setFreq: setEqHighMidFreq, setGain: setEqHighMidGain },
                        { key: "High", freq: eqHighFreq || 12000, gain: eqHighGain || 0, setFreq: setEqHighFreq, setGain: setEqHighGain }
                    ].map(band => (
                        <div key={band.key} style={{ textAlign: "center", padding: "8px", background: "var(--background-secondary)", borderRadius: "4px" }}>
                            <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>{band.key}</div>
                            <div style={{ fontSize: "10px", marginBottom: "4px" }}>
                                <TextInput
                                    disabled={!eqEnabled || isSaving}
                                    value={band.freq.toString()}
                                    onChange={value => validateTextInputNumber(value) && band.setFreq(parseInt(value) || 0)}
                                    style={{ width: "40px", height: "20px", fontSize: "10px" }}
                                />
                            </div>
                            <div>
                                <Slider
                                    disabled={!eqEnabled || isSaving}
                                    onValueChange={value => band.setGain(value)}
                                    initialValue={band.gain}
                                    minValue={-12}
                                    maxValue={12}
                                    onValueRender={value => `${value.toFixed(1)}dB`}
                                    style={{ height: "60px" }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </SettingsModalCardItem>
        </SettingsModalCard>;

    const settingsCardCompressor =
        <SettingsModalCard
            title=" Compressor"
            switchEnabled
            flex={1}
            switchProps={{
                checked: compEnabled ?? false,
                disabled: isSaving,
                onChange: status => setCompEnabled(status)
            }}>
            <SettingsModalCardItem title="Compression Settings">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginTop: "8px" }}>
                    <div>
                        <div style={{ fontSize: "12px", marginBottom: "4px", fontWeight: "bold", color: "var(--text-normal)" }}>
                            Threshold: {compThreshold || -20}dB
                        </div>
                        <div style={{ fontSize: "10px", marginBottom: "4px", color: "var(--text-muted)" }}>
                            Audio level where compression starts
                        </div>
                        <Slider
                            disabled={!compEnabled || isSaving}
                            onValueChange={value => setCompThreshold(value)}
                            initialValue={compThreshold || -20}
                            minValue={-60}
                            maxValue={0}
                            onValueRender={value => `${value.toFixed(1)}dB`}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: "12px", marginBottom: "4px", fontWeight: "bold", color: "var(--text-normal)" }}>
                            Ratio: {compRatio || 4}:1
                        </div>
                        <div style={{ fontSize: "10px", marginBottom: "4px", color: "var(--text-muted)" }}>
                            Amount of audio reduction when threshold is exceeded
                        </div>
                        <Slider
                            disabled={!compEnabled || isSaving}
                            onValueChange={value => setCompRatio(value)}
                            initialValue={compRatio || 4}
                            minValue={1}
                            maxValue={20}
                            onValueRender={value => `${value.toFixed(1)}:1`}
                        />
                    </div>
                </div>
            </SettingsModalCardItem>
        </SettingsModalCard>;

    const settingsCardReverb =
        <SettingsModalCard
            title=" Reverb"
            switchEnabled
            flex={1}
            switchProps={{
                checked: reverbEnabled ?? false,
                disabled: isSaving,
                onChange: status => setReverbEnabled(status)
            }}>
            <SettingsModalCardItem title="Reverb Settings">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginTop: "8px" }}>
                    <div>
                        <div style={{ fontSize: "12px", marginBottom: "4px", fontWeight: "bold", color: "var(--text-normal)" }}>
                            Length: {reverbSeconds || 1.2}s
                        </div>
                        <div style={{ fontSize: "10px", marginBottom: "4px", color: "var(--text-muted)" }}>
                            Total duration of the reverb effect
                        </div>
                        <Slider
                            disabled={!reverbEnabled || isSaving}
                            onValueChange={value => setReverbSeconds(value)}
                            initialValue={reverbSeconds || 1.2}
                            minValue={0.1}
                            maxValue={5}
                            onValueRender={value => `${value.toFixed(1)}s`}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: "12px", marginBottom: "4px", fontWeight: "bold", color: "var(--text-normal)" }}>
                            Decay: {reverbDecay || 2.5}
                        </div>
                        <div style={{ fontSize: "10px", marginBottom: "4px", color: "var(--text-muted)" }}>
                            Speed of reverb decay
                        </div>
                        <Slider
                            disabled={!reverbEnabled || isSaving}
                            onValueChange={value => setReverbDecay(value)}
                            initialValue={reverbDecay || 2.5}
                            minValue={0.5}
                            maxValue={5}
                            onValueRender={value => `${value.toFixed(1)}`}
                        />
                    </div>
                </div>
            </SettingsModalCardItem>
        </SettingsModalCard>;

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
                : <div style={{ display: "flex", flexDirection: "column", width: "60em", gap: "1em", maxHeight: "40em" }}>
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
                    <SettingsModalCardRow>
                        {settingsCardVoiceEffects}
                        {settingsCardEQ}
                    </SettingsModalCardRow>
                    <SettingsModalCardRow>
                        {settingsCardCompressor}
                        {settingsCardReverb}
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
