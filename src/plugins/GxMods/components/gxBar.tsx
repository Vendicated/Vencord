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

import { useForceUpdater } from "@utils/react";
import { Forms, React, Tooltip } from "@webpack/common";

import { GxModManifest } from "../types";
import { MusicNote, MusicNoteSlashed, OperaGX, Options } from "./icons";

export const ControlPanel = (This: {
    bgmMuted: boolean;
    onBgmToggle: () => void;
    onModInfoChange: (cb: () => void) => void;
    manifestJson?: GxModManifest;
}) => {
    const forceUpdate = useForceUpdater();

    React.useEffect(() => {
        This.onModInfoChange(forceUpdate);
    }, [This, forceUpdate]);

    const MuteBtn = () => {
        const [muted, setMuted] = React.useState<boolean>(This.bgmMuted);
        const [isHovered, setIsHovered] = React.useState<boolean>(false);

        const Note = !muted ? MusicNote : MusicNoteSlashed;

        return <Tooltip text={muted ? "Unmute music" : "Mute music"} >
            {({ onMouseEnter, onMouseLeave }) => {
                return <div
                    style={{
                        display: "flex",
                        borderRadius: "4px",
                        padding: "4px",
                        paddingLeft: "5px",
                        paddingRight: "6px",
                        cursor: "pointer",
                        alignItems: "center",
                        ...(isHovered ? { backgroundColor: "var(--background-modifier-selected)" } : {})
                    }}
                    onMouseEnter={_ => { onMouseEnter(); setIsHovered(true); }}
                    onMouseLeave={_ => { onMouseLeave(); setIsHovered(false); }}
                    onClick={() => {
                        This.bgmMuted = !This.bgmMuted;
                        This.onBgmToggle();

                        setMuted(This.bgmMuted);
                    }}
                >
                    <Note
                        width={22}
                        height={22}
                        color={isHovered ? "var(--interactive-hover)" : "var(--interactive-normal)"}
                        slashColor="var(--button-danger-background)"
                    />
                </div>;
            }}
        </Tooltip>;
    };

    const [GxIconHovered, setGxIconHovered] = React.useState<boolean>(false);
    const [OptionsIconHovered, setOptionsIconHovered] = React.useState<boolean>(false);

    return (
        <span>
            <div style={{
                padding: "5px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <span
                    style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "4px",
                        ...(GxIconHovered ? { backgroundColor: "var(--background-modifier-selected)" } : {})
                    }}
                >
                    <Tooltip text="GX Mods">{({ onMouseEnter, onMouseLeave }) => {
                        return <div
                            style={{ padding: "4px", paddingLeft: "5px", marginTop: "1px" }}
                            onMouseEnter={_ => { onMouseEnter(); setGxIconHovered(true); }}
                            onMouseLeave={_ => { onMouseLeave(); setGxIconHovered(false); }}
                            onClick={() => VencordNative.native.openExternal("https://store.gx.me")}
                        >
                            <OperaGX width={26} height={26} color={!GxIconHovered ? "hsl(334deg 65% 32%)" : "hsl(334, 96%, 55%)"} />
                        </div>;
                    }}</Tooltip>
                </span>
                {/* <div>
                    <Forms.FormText variant="text-xs/normal">“{This.manifestJson?.name}”</Forms.FormText>
                    <Forms.FormText variant="text-xs/medium">
                        “{This.manifestJson?.developer.name}”
                    </Forms.FormText>
                </div> */}
                <span style={{ display: "flex" }}>
                    <MuteBtn />
                    <Tooltip text="GXMod Settings">{({ onMouseEnter, onMouseLeave }) => {
                        return <div
                            style={{
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                borderRadius: "4px",
                                padding: "4px",
                                paddingInline: "5px",
                                ...(OptionsIconHovered ? { backgroundColor: "var(--background-modifier-selected)" } : {})
                            }}
                            onMouseEnter={_ => { onMouseEnter(); setOptionsIconHovered(true); }}
                            onMouseLeave={_ => { onMouseLeave(); setOptionsIconHovered(false); }}
                        >
                            <Options width={22} height={22} color={!OptionsIconHovered ? "var(--interactive-normal)" : "var(--interactive-hover)"} />
                        </div>;
                    }}</Tooltip>
                </span>
            </div>
            <Forms.FormDivider />
        </span>
    );
};
