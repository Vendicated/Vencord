/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, React, TextInput } from "@webpack/common";

import { setDebugEnabled } from "./debugLog";
import hoverOnlyStyle from "./hoverOnly.css?managed";
import { Player } from "./PlayerComponent.tsx";
import { type HTTPQConfig, WinampStore } from "./WinampStore";

function toggleHoverControls(value: boolean) {
    (value ? enableStyle : disableStyle)(hoverOnlyStyle);
}

function updateHttpQConfig() {
    WinampStore.configure({
        host: settings.store.httpqHost,
        port: settings.store.httpqPort,
        password: settings.store.httpqPassword
    });
}

function UICustomizationSettings() {
    const { hoverControls, previousButtonRestartsTrack, debugLogging, showSeekBar, showVolumeBar } = settings.use(["hoverControls", "previousButtonRestartsTrack", "debugLogging", "showSeekBar", "showVolumeBar"]);

    function handleHoverControlsChange(value: boolean) {
        settings.store.hoverControls = value;
        toggleHoverControls(value);
    }

    function handlePreviousButtonRestartsTrackChange(value: boolean) {
        settings.store.previousButtonRestartsTrack = value;
    }

    function handleDebugLoggingChange(value: boolean) {
        settings.store.debugLogging = value;
        setDebugEnabled(value);
    }

    function handleShowSeekBarChange(value: boolean) {
        settings.store.showSeekBar = value;
    }

    function handleShowVolumeBarChange(value: boolean) {
        settings.store.showVolumeBar = value;
    }

    return (
        <div style={{
            padding: 16,
            backgroundColor: "var(--background-secondary-alt)",
            borderRadius: 8,
            marginBottom: 16
        }}>
            <Heading tag="h3" style={{ marginBottom: 12, fontSize: 16 }}>UI Customization</Heading>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16
            }}>
                <FormSwitch
                    value={hoverControls}
                    onChange={handleHoverControlsChange}
                    title="Hover controls"
                    description="Show controls only when hovering"
                    hideBorder
                />

                <FormSwitch
                    value={previousButtonRestartsTrack}
                    onChange={handlePreviousButtonRestartsTrackChange}
                    title="Previous restarts track"
                    description="Restart track if >3s elapsed"
                    hideBorder
                />

                <FormSwitch
                    value={debugLogging}
                    onChange={handleDebugLoggingChange}
                    title="Debug logging"
                    description="Log debug info to console"
                    hideBorder
                />

                <FormSwitch
                    value={showSeekBar}
                    onChange={handleShowSeekBarChange}
                    title="Show seek bar"
                    description="Show seek bar on player"
                    hideBorder
                />

                <FormSwitch
                    value={showVolumeBar}
                    onChange={handleShowVolumeBarChange}
                    title="Show volume bar"
                    description="Show volume bar on player"
                    hideBorder
                />
            </div>
        </div>
    );
}

function HttpQServerSettings() {
    const { httpqHost, httpqPort, httpqPassword } = settings.use(["httpqHost", "httpqPort", "httpqPassword"]);
    const [buttonState, setButtonState] = React.useState<"normal" | "loading" | "success" | "error">("normal");
    const [portError, setPortError] = React.useState(false);

    function handleHostChange(value: string) {
        settings.store.httpqHost = value;
        setButtonState("normal");
    }

    function handlePortChange(value: string) {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue > 0 && numValue <= 65535) {
            settings.store.httpqPort = numValue;
            setPortError(false);
        } else {
            setPortError(true);
        }
        setButtonState("normal");
    }

    function handlePasswordChange(value: string) {
        settings.store.httpqPassword = value;
        setButtonState("normal");
    }

    async function testConnection() {
        setButtonState("loading");

        try {
            const config: HTTPQConfig = {
                host: httpqHost,
                port: httpqPort,
                password: httpqPassword
            };

            const isConnected = await WinampStore.testConfig(config);

            if (isConnected) {
                setButtonState("success");
                setTimeout(() => setButtonState("normal"), 2000);
            } else {
                setButtonState("error");
                setTimeout(() => setButtonState("normal"), 2000);
            }
        } catch (error) {
            setButtonState("error");
            setTimeout(() => setButtonState("normal"), 2000);
        }
    }

    function getButtonText() {
        switch (buttonState) {
            case "loading": return "Testing...";
            case "success": return "✓ Connected";
            case "error": return "✗ Failed";
            default: return "Test Connection";
        }
    }

    function getButtonColor() {
        switch (buttonState) {
            case "success": return Button.Colors.GREEN;
            case "error": return Button.Colors.RED;
            default: return Button.Colors.BRAND;
        }
    }

    return (
        <div style={{
            padding: 16,
            backgroundColor: "var(--background-secondary-alt)",
            borderRadius: 8,
            marginBottom: 16
        }}>
            <Heading tag="h3" style={{ marginBottom: 8, fontSize: 16 }}>HttpQ Server Configuration</Heading>
            <Paragraph style={{ marginBottom: 8, fontSize: 13 }}>
                Configure connection settings for Winamp's HttpQ plugin
            </Paragraph>

            <Paragraph style={{ marginBottom: 12, fontSize: 13, color: "var(--text-warning)" }}>
                ⚠️ You will need to restart Vencord for configuration changes to take effect
            </Paragraph>

            <Flex flexDirection="row" style={{ gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: 2 }}>
                    <Heading tag="h5" style={{ fontSize: 14, marginBottom: 4 }}>Host</Heading>
                    <TextInput
                        value="localhost"
                        disabled={true}
                        placeholder="localhost"
                        style={{ opacity: 0.6, cursor: "not-allowed" }}
                    />
                    <Paragraph style={{ marginTop: 4, fontSize: 12 }}>
                        HttpQ communication is limited to the local machine for security reasons
                    </Paragraph>
                </div>
                <div style={{ flex: 1 }}>
                    <Heading tag="h5" style={{ fontSize: 14, marginBottom: 4 }}>Port</Heading>
                    <TextInput
                        type="number"
                        value={httpqPort}
                        onChange={handlePortChange}
                        placeholder="4800"
                        error={portError ? "Invalid port number" : undefined}
                    />
                </div>
                <div style={{ flex: 1.5 }}>
                    <Heading tag="h5" style={{ fontSize: 14, marginBottom: 4 }}>Password</Heading>
                    <TextInput
                        value={httpqPassword}
                        onChange={handlePasswordChange}
                        placeholder="pass"
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <Button
                        onClick={testConnection}
                        disabled={buttonState === "loading" || portError}
                        size={Button.Sizes.SMALL}
                        color={getButtonColor()}
                        style={{ width: "100%" }}
                    >
                        {getButtonText()}
                    </Button>
                </div>
            </Flex>
        </div>
    );
}

export const settings = definePluginSettings({
    uiCustomizations: {
        type: OptionType.COMPONENT,
        component: UICustomizationSettings
    },
    hoverControls: {
        description: "Show controls on hover",
        type: OptionType.BOOLEAN,
        default: false,
        onChange: v => toggleHoverControls(v),
        hidden: true
    },
    previousButtonRestartsTrack: {
        type: OptionType.BOOLEAN,
        description: "Restart currently playing track when pressing the previous button if playtime is >3s",
        default: true,
        hidden: true
    },
    debugLogging: {
        type: OptionType.BOOLEAN,
        description: "Enable debug logging to console",
        default: false,
        hidden: true
    },
    showSeekBar: {
        type: OptionType.BOOLEAN,
        description: "Show seek bar on main player",
        default: true,
        hidden: true
    },
    showVolumeBar: {
        type: OptionType.BOOLEAN,
        description: "Show volume bar on main player",
        default: true,
        hidden: true
    },
    httpqSettings: {
        type: OptionType.COMPONENT,
        component: HttpQServerSettings
    },
    httpqHost: {
        type: OptionType.STRING,
        description: "HttpQ server host/IP address",
        default: "localhost",
        hidden: true
    },
    httpqPort: {
        type: OptionType.NUMBER,
        description: "HttpQ server port",
        default: 4800,
        hidden: true
    },
    httpqPassword: {
        type: OptionType.STRING,
        description: "HttpQ server password",
        default: "pass",
        hidden: true
    }
});

export default definePlugin({
    name: "WinampControls",
    description: "Adds a Winamp player above the account panel",
    authors: [Devs.Ven, Devs.afn, Devs.KraXen72, Devs.Av32000, Devs.nin0dev, { name: "RNDev", id: 454590946756263936n }],
    settings,
    native: {
        play: "play",
        pause: "pause",
        stop: "stop",
        next: "next",
        prev: "prev",
        isPlaying: "isPlaying",
        getOutputTime: "getOutputTime",
        getVolume: "getVolume",
        setVolume: "setVolume",
        getListLength: "getListLength",
        getListPos: "getListPos",
        setPlaylistPos: "setPlaylistPos",
        getPlaylistFile: "getPlaylistFile",
        getPlaylistTitle: "getPlaylistTitle",
        getPlaylistTitleList: "getPlaylistTitleList",
        repeat: "repeat",
        repeatStatus: "repeatStatus",
        shuffle: "shuffle",
        shuffleStatus: "shuffleStatus",
        jumpToTime: "jumpToTime",
        getCurrentTitle: "getCurrentTitle",
        getId3Tag: "getId3Tag",
        hasId3Tag: "hasId3Tag",
        getVersion: "getVersion"
    },
    patches: [
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                // react.jsx)(AccountPanel, { ..., showTaglessAccountPanel: blah })
                match: /(?<=\i\.jsxs?\)\()(\i),{(?=[^}]*?userTag:\i,hidePrivateData:)/,
                // react.jsx(WrapperComponent, { VencordOriginal: AccountPanel, ...
                replace: "$self.PanelWrapper,{VencordOriginal:$1,"
            }
        }
    ],

    start: () => {
        toggleHoverControls(settings.store.hoverControls);
        setDebugEnabled(settings.store.debugLogging);
        updateHttpQConfig();
    },

    PanelWrapper({ VencordOriginal, ...props }) {
        return (
            <>
                <ErrorBoundary
                    fallback={() => (
                        <div className="vc-winamp-fallback">
                            <p>Failed to render Winamp Modal :(</p>
                            <p>Check the console for errors</p>
                        </div>
                    )}
                >
                    <Player />
                </ErrorBoundary>

                <VencordOriginal {...props} />
            </>
        );
    }
});
