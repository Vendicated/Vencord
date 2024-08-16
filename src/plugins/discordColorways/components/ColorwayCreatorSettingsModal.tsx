/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Switch from "./Switch";
import { getPreset } from "../css";
import { ModalProps } from "../types";
import { useState, useEffect, DataStore } from "..";
import Setting from "./Setting";

export default function ({ modalProps, onSettings, presetId, hasTintedText, hasDiscordSaturation }: { modalProps: ModalProps, presetId: string, hasTintedText: boolean, hasDiscordSaturation: boolean, onSettings: ({ presetId, tintedText, discordSaturation }: { presetId: string, tintedText: boolean, discordSaturation: boolean; }) => void; }) {
    const [tintedText, setTintedText] = useState<boolean>(hasTintedText);
    const [discordSaturation, setDiscordSaturation] = useState<boolean>(hasDiscordSaturation);
    const [preset, setPreset] = useState<string>(presetId);
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);
    return <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
        <h2 className="colorwaysModalHeader">Creator Settings</h2>
        <div className="colorwaysModalContent" style={{
            minWidth: "500px"
        }}>
            <span className="colorwaysModalSectionHeader">
                Presets:
            </span>
            <div className="colorwaysScroller" style={{ paddingRight: "2px", marginBottom: "20px", maxHeight: "250px" }}>
                {Object.values(getPreset()).map(pre => <div
                    aria-checked={preset === pre.id}
                    className="discordColorway"
                    style={{ padding: "10px", marginBottom: "8px" }}
                    onClick={() => {
                        setPreset(pre.id);
                    }}>
                    <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                        {preset === pre.id && <circle cx="12" cy="12" r="5" className="radioIconForeground-3wH3aU" fill="currentColor" />}
                    </svg>
                    <span className="colorwayLabel">{pre.name}</span>
                </div>)}
            </div>
            <Setting divider>
                <Switch value={tintedText} onChange={setTintedText} label="Use colored text" />
            </Setting>
            <Switch value={discordSaturation} onChange={setDiscordSaturation} label="Use Discord's saturation" />
        </div>
        <div className="colorwaysModalFooter">
            <button
                className="colorwaysPillButton colorwaysPillButton-onSurface"
                onClick={() => {
                    onSettings({ presetId: preset, discordSaturation: discordSaturation, tintedText: tintedText });
                    modalProps.onClose();
                }}
            >
                Finish
            </button>
            <button
                className="colorwaysPillButton"
                onClick={() => {
                    modalProps.onClose();
                }}
            >
                Cancel
            </button>
        </div>
    </div>;
}
