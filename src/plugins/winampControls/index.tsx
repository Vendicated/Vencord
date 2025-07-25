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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, Switch, TextInput } from "@webpack/common";

import hoverOnlyStyle from "./hoverOnly.css?managed";
import { Player } from "./PlayerComponent";
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
    const { hoverControls, previousButtonRestartsTrack, showSeeker } = settings.use(["hoverControls", "previousButtonRestartsTrack", "showSeeker"]);

    function handleHoverControlsChange(value: boolean) {
        settings.store.hoverControls = value;
        toggleHoverControls(value);
    }

    function handlePreviousButtonRestartsTrackChange(value: boolean) {
        settings.store.previousButtonRestartsTrack = value;
    }

    function handleShowSeekerChange(value: boolean) {
        settings.store.showSeeker = value;
    }

    return (
        <div style={{
            padding: 16,
            backgroundColor: "var(--background-secondary-alt)",
            borderRadius: 8,
            marginBottom: 16
        }}>
            <Forms.FormSection>
                <Forms.FormTitle tag="h3" style={{ marginBottom: 12, fontSize: 16 }}>UI Customization</Forms.FormTitle>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16
                }}>
                    <Switch
                        value={hoverControls}
                        onChange={handleHoverControlsChange}
                        note="Show controls only when hovering"
                    >
                        Hover controls
                    </Switch>

                    <Switch
                        value={previousButtonRestartsTrack}
                        onChange={handlePreviousButtonRestartsTrackChange}
                        note="Restart track if >3s elapsed"
                    >
                        Previous restarts track
                    </Switch>

                    <Switch
                        value={showSeeker}
                        onChange={handleShowSeekerChange}
                        note="Display seek bar in controls"
                    >
                        Show seeker
                    </Switch>
                </div>
            </Forms.FormSection>
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
            <Forms.FormSection>
                <Forms.FormTitle tag="h3" style={{ marginBottom: 8, fontSize: 16 }}>HttpQ Server Configuration</Forms.FormTitle>
                <Forms.FormText type="description" style={{ marginBottom: 8, fontSize: 13 }}>
                    Configure connection settings for Winamp's HttpQ plugin
                </Forms.FormText>

                <Forms.FormText type="warning" style={{ marginBottom: 12, fontSize: 13 }}>
                    ⚠️ You will need to restart Vencord for configuration changes to take effect
                </Forms.FormText>

                <Flex flexDirection="row" style={{ gap: 12, alignItems: "flex-end" }}>
                    <div style={{ flex: 2 }}>
                        <Forms.FormTitle tag="h5" style={{ fontSize: 14, marginBottom: 4 }}>Host</Forms.FormTitle>
                        <TextInput
                            value={httpqHost}
                            onChange={handleHostChange}
                            placeholder="127.0.0.1"
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Forms.FormTitle tag="h5" style={{ fontSize: 14, marginBottom: 4 }}>Port</Forms.FormTitle>
                        <TextInput
                            type="number"
                            value={httpqPort}
                            onChange={handlePortChange}
                            placeholder="4800"
                            error={portError ? "Invalid port number" : undefined}
                        />
                    </div>
                    <div style={{ flex: 1.5 }}>
                        <Forms.FormTitle tag="h5" style={{ fontSize: 14, marginBottom: 4 }}>Password</Forms.FormTitle>
                        <TextInput
                            value={httpqPassword}
                            onChange={handlePasswordChange}
                            placeholder="pass"
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Button
                            onClick={testConnection}
                            submitting={buttonState === "loading"}
                            disabled={buttonState === "loading" || portError}
                            size={Button.Sizes.SMALL}
                            color={getButtonColor()}
                            style={{ width: "100%" }}
                        >
                            {getButtonText()}
                        </Button>
                    </div>
                </Flex>
            </Forms.FormSection>
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
    showSeeker: {
        type: OptionType.BOOLEAN,
        description: "Show seeker bar in player controls",
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
        default: "127.0.0.1",
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
    authors: [Devs.Ven, Devs.afn, Devs.KraXen72, Devs.Av32000, Devs.nin0dev, Devs.RNDev],
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
            find: "this.isCopiedStreakGodlike",
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
