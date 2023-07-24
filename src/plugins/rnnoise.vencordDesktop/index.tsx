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

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Switch } from "@components/Switch";
import { loadRnnoise, RnnoiseWorkletNode } from "@sapphi-red/web-noise-suppressor";
import { Devs } from "@utils/constants";
import { rnnoiseWasmSrc, rnnoiseWorkletSrc } from "@utils/dependencies";
import { makeLazy } from "@utils/lazy";
import { LazyComponent } from "@utils/react";
import definePlugin from "@utils/types";
import { findByCode } from "@webpack";
import { FluxDispatcher, Popout } from "@webpack/common";
import { MouseEvent, ReactNode } from "react";

import { SupressionIcon } from "./icons";

const RNNOISE_OPTION = "RNNOISE";

interface PanelButtonProps {
    tooltipText: string;
    icon: () => ReactNode;
    onClick: (event: MouseEvent<HTMLElement>) => void;
    tooltipClassName?: string;
    disabled?: boolean;
}
const PanelButton = LazyComponent<PanelButtonProps>(() => findByCode("Masks.PANEL_BUTTON"));

const cl = classNameFactory("vc-rnnoise-");
const getRnnoiseWasm = makeLazy(() => loadRnnoise({
    url: rnnoiseWasmSrc(),
    simdUrl: rnnoiseWasmSrc(true),
}));

const settings = definePluginSettings({}).withPrivateSettings<{ isEnabled: boolean; }>();
const setEnabled = (enabled: boolean) => {
    settings.store.isEnabled = enabled;
    FluxDispatcher.dispatch({ type: "AUDIO_SET_NOISE_SUPPRESSION", enabled });
};

function NoiseSupressionPopout() {
    const { isEnabled } = settings.use();

    return <div className={cl("popout")}>
        <div className={cl("popout-heading")}>
            <span>Noise Supression</span>
            <Switch checked={isEnabled} onChange={setEnabled} />
        </div>
        <div className={cl("popout-desc")}>
            Enable AI noise suppression! Make some noise&mdash;like becoming an air conditioner, or a laptop fan&mdash;while speaking. Your friends will hear nothing but your beautiful voice ✨
        </div>
    </div>;
}

export default definePlugin({
    name: "AI Noise Suppression",
    description: "Uses an open-source AI model (RNNoise) to remove background noise from your microphone",
    authors: [Devs.Vap],
    settings,
    enabledByDefault: true,

    patches: [
        {
            find: "window.webkitAudioContext",
            replacement: {
                match: /(?<=\i\.acquire=function\((\i)\)\{return )navigator\.mediaDevices\.getUserMedia\(\1\)(?=\})/,
                replace: m => `${m}.then(stream => $self.connectRnnoise(stream))`
            },
        },
        {
            find: "renderNoiseCancellation()",
            replacement: {
                match: /(?<=(\i)\.jsxs?.{0,70}children:\[)(?=\i\?\i\.renderNoiseCancellation\(\))/,
                replace: (_, react) => `${react}.jsx($self.NoiseSupressionButton, {}),`
            },
        },
        {
            find: "Messages.USER_SETTINGS_NOISE_CANCELLATION_KRISP",
            replacement: [{
                match: /(?<=(\i)=\i\?\i\.KRISP:\i.{1,20}?;)/,
                replace: (_, option) => `if ($self.isEnabled()) ${option} = ${JSON.stringify(RNNOISE_OPTION)};`,
            }, {
                match: /(?=\i&&(\i)\.push\(\{name:(?:\i\.){1,2}Messages.USER_SETTINGS_NOISE_CANCELLATION_KRISP)/,
                replace: (_, options) => `${options}.push({ name: "AI (RNNoise)", value: "${RNNOISE_OPTION}" });`,
            }, {
                match: /(?<=onChange:function\((\i)\)\{)(?=(?:\i\.){1,2}setNoiseCancellation)/,
                replace: (_, option) => `$self.setEnabled(${option}.value === ${JSON.stringify(RNNOISE_OPTION)});`,
            }],
        },
    ],

    setEnabled,
    isEnabled: () => settings.store.isEnabled,
    async connectRnnoise(stream: MediaStream): Promise<MediaStream> {
        if (!settings.store.isEnabled) return stream;

        const audioCtx = new AudioContext();
        await audioCtx.audioWorklet.addModule(rnnoiseWorkletSrc);

        const rnnoiseWasm = await getRnnoiseWasm();
        const rnnoise = new RnnoiseWorkletNode(audioCtx, {
            wasmBinary: rnnoiseWasm,
            maxChannels: 1,
        });

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(rnnoise);

        const dest = audioCtx.createMediaStreamDestination();
        rnnoise.connect(dest);

        // Cleanup
        const onEnded = () => {
            rnnoise.disconnect();
            source.disconnect();
            audioCtx.close();
            rnnoise.destroy();
        };
        stream.addEventListener("inactive", onEnded, { once: true });

        return dest.stream;
    },
    NoiseSupressionButton(): ReactNode {
        const { isEnabled } = settings.use();

        return <Popout
            key="rnnoise-popout"
            align="center"
            animation={Popout.Animation.TRANSLATE}
            autoInvert={true}
            nudgeAlignIntoViewport={true}
            position="top"
            renderPopout={() => <NoiseSupressionPopout />}
            spacing={8}
        >
            {(props, { isShown }) => (
                <PanelButton
                    {...props}
                    tooltipText="Noise Suppression powered by RNNoise"
                    tooltipClassName={cl("tooltip")}
                    icon={() => <SupressionIcon enabled={isEnabled} />}
                />
            )}
        </Popout>;
    },
});
