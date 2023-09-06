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
import { Logger } from "@utils/Logger";
import { LazyComponent } from "@utils/react";
import definePlugin from "@utils/types";
import { findByCode } from "@webpack";
import { FluxDispatcher, Popout, React } from "@webpack/common";
import { MouseEvent, ReactNode } from "react";

import { SupressionIcon } from "./icons";

const RNNOISE_OPTION = "RNNOISE";

interface PanelButtonProps {
    tooltipText: string;
    icon: () => ReactNode;
    onClick: (event: MouseEvent<HTMLElement>) => void;
    tooltipClassName?: string;
    disabled?: boolean;
    shouldShow?: boolean;
}
const PanelButton = LazyComponent<PanelButtonProps>(() => findByCode("Masks.PANEL_BUTTON"));
const enum SpinnerType {
    SpinningCircle = "spinningCircle",
    ChasingDots = "chasingDots",
    LowMotion = "lowMotion",
    PulsingEllipsis = "pulsingEllipsis",
    WanderingCubes = "wanderingCubes",
}
export interface SpinnerProps {
    type: SpinnerType;
    animated?: boolean;
    className?: string;
    itemClassName?: string;
}
const Spinner = LazyComponent<SpinnerProps>(() => findByCode(".spinningCircleInner"));

function createExternalStore<S>(init: () => S) {
    const subscribers = new Set<() => void>();
    let state = init();

    return {
        get: () => state,
        set: (newStateGetter: (oldState: S) => S) => {
            state = newStateGetter(state);
            for (const cb of subscribers) cb();
        },
        use: () => {
            return React.useSyncExternalStore<S>(onStoreChange => {
                subscribers.add(onStoreChange);
                return () => subscribers.delete(onStoreChange);
            }, () => state);
        },
    } as const;
}

const cl = classNameFactory("vc-rnnoise-");

const loadedStore = createExternalStore(() => ({
    isLoaded: false,
    isLoading: false,
    isError: false,
}));
const getRnnoiseWasm = makeLazy(() => {
    loadedStore.set(s => ({ ...s, isLoading: true }));
    return loadRnnoise({
        url: rnnoiseWasmSrc(),
        simdUrl: rnnoiseWasmSrc(true),
    }).then(buffer => {
        // Check WASM magic number cus fetch doesnt throw on 4XX or 5XX
        if (new DataView(buffer.slice(0, 4)).getUint32(0) !== 0x0061736D) throw buffer;

        loadedStore.set(s => ({ ...s, isLoaded: true }));
        return buffer;
    }).catch(error => {
        if (error instanceof ArrayBuffer) error = new TextDecoder().decode(error);
        logger.error("Failed to load RNNoise WASM:", error);
        loadedStore.set(s => ({ ...s, isError: true }));
        return null;
    }).finally(() => {
        loadedStore.set(s => ({ ...s, isLoading: false }));
    });
});

const logger = new Logger("RNNoise");
const settings = definePluginSettings({}).withPrivateSettings<{ isEnabled: boolean; }>();
const setEnabled = (enabled: boolean) => {
    settings.store.isEnabled = enabled;
    FluxDispatcher.dispatch({ type: "AUDIO_SET_NOISE_SUPPRESSION", enabled });
};

function NoiseSupressionPopout() {
    const { isEnabled } = settings.use();
    const { isLoading, isError } = loadedStore.use();
    const isWorking = isEnabled && !isError;

    return <div className={cl("popout")}>
        <div className={cl("popout-heading")}>
            <span>Noise Supression</span>
            <div style={{ flex: 1 }} />
            {isLoading && <Spinner type={SpinnerType.PulsingEllipsis} />}
            <Switch checked={isWorking} onChange={setEnabled} disabled={isError} />
        </div>
        <div className={cl("popout-desc")}>
            Enable AI noise suppression! Make some noise&mdash;like becoming an air conditioner, or a vending machine fan&mdash;while speaking. Your friends will hear nothing but your beautiful voice ✨
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
            // Pass microphone stream to RNNoise
            find: "window.webkitAudioContext",
            replacement: {
                match: /(?<=\i\.acquire=function\((\i)\)\{return )navigator\.mediaDevices\.getUserMedia\(\1\)(?=\})/,
                replace: "$&.then(stream => $self.connectRnnoise(stream, $1.audio))"
            },
        },
        {
            // Noise suppression button in call modal
            find: "renderNoiseCancellation()",
            replacement: {
                match: /(?<=(\i)\.jsxs?.{0,70}children:\[)(?=\i\?\i\.renderNoiseCancellation\(\))/,
                replace: (_, react) => `${react}.jsx($self.NoiseSupressionButton, {}),`
            },
        },
        {
            // Give noise suppression component a "shouldShow" prop
            find: "Masks.PANEL_BUTTON",
            replacement: {
                match: /(?<==(\i)\.tooltipForceOpen.{0,100})(?=tooltipClassName:)/,
                replace: (_, props) => `shouldShow: ${props}.shouldShow,`
            }
        },
        {
            // Noise suppression option in voice settings
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
    async connectRnnoise(stream: MediaStream, isAudio: boolean): Promise<MediaStream> {
        if (!isAudio) return stream;
        if (!settings.store.isEnabled) return stream;

        const audioCtx = new AudioContext();
        await audioCtx.audioWorklet.addModule(rnnoiseWorkletSrc);

        const rnnoiseWasm = await getRnnoiseWasm();
        if (!rnnoiseWasm) {
            logger.warn("Failed to load RNNoise, noise suppression won't work");
            return stream;
        }

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
        const { isLoading, isError } = loadedStore.use();

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
                    shouldShow={!isShown}
                    icon={() => <div style={{
                        color: isError ? "var(--status-danger)" : "inherit",
                        opacity: isLoading ? 0.5 : 1,
                    }}>
                        <SupressionIcon enabled={isEnabled} />
                    </div>}
                />
            )}
        </Popout>;
    },
});
