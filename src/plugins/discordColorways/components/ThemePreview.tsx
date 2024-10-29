/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CloseIcon } from "./Icons";
import { HexToHSL } from "../utils";
import { openModal } from "..";
import { ModalProps } from "../types";

export default function ThemePreview({
    accent,
    primary,
    secondary,
    tertiary,
    previewCSS,
    modalProps,
    isModal
}: {
    accent: string,
    primary: string,
    secondary: string,
    tertiary: string,
    previewCSS?: string,
    modalProps?: ModalProps,
    isModal?: boolean;
}) {
    return <>
        <style>
            {".colorwaysPreview-wrapper {color: var(--header-secondary); box-shadow: var(--legacy-elevation-border);}" + previewCSS}
        </style>
        <div
            className="colorwaysPreview-wrapper"
            style={{ background: `var(--dc-overlay-app-frame, ${tertiary})` }}
        >
            <div className="colorwaysPreview-titlebar" />
            <div className="colorwaysPreview-body">
                <div className="colorwayPreview-guilds">
                    <div className="colorwayPreview-guild">
                        <div
                            className="colorwayPreview-guildItem"
                            style={{ background: `var(--dc-guild-button, ${primary})` }}
                            onMouseEnter={e => e.currentTarget.style.background = accent}
                            onMouseLeave={e => e.currentTarget.style.background = `var(--dc-guild-button, ${primary})`}
                            onClick={() => {
                                if (isModal) {
                                    modalProps?.onClose();
                                } else {
                                    openModal((props: ModalProps) => <div className={`colorwaysPreview-modal ${props.transitionState == 2 ? "closing" : ""} ${props.transitionState == 4 ? "hidden" : ""}`}>
                                        <style>
                                            {previewCSS}
                                        </style>
                                        <ThemePreview accent={accent} primary={primary} secondary={secondary} tertiary={tertiary} isModal modalProps={props} />
                                    </div>);
                                }
                            }}
                        >
                            {isModal ? <CloseIcon style={{ color: "var(--header-secondary)" }} /> : <svg
                                aria-hidden="true"
                                role="img"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    fill="currentColor"
                                    d="M19,3H14V5h5v5h2V5A2,2,0,0,0,19,3Z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M19,19H14v2h5a2,2,0,0,0,2-2V14H19Z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M3,5v5H5V5h5V3H5A2,2,0,0,0,3,5Z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5,14H3v5a2,2,0,0,0,2,2h5V19H5Z"
                                />
                            </svg>}
                        </div>
                    </div>
                    <div className="colorwayPreview-guild">
                        <div className="colorwayPreview-guildSeparator" style={{ backgroundColor: primary }} />
                    </div>
                    <div className="colorwayPreview-guild">
                        <div
                            className="colorwayPreview-guildItem"
                            style={{ background: `var(--dc-guild-button, ${primary})` }}
                            onMouseEnter={e => e.currentTarget.style.background = accent}
                            onMouseLeave={e => e.currentTarget.style.background = `var(--dc-guild-button, ${primary})`}
                        />
                    </div>
                    <div className="colorwayPreview-guild">
                        <div
                            className="colorwayPreview-guildItem"
                            style={{ background: `var(--dc-guild-button, ${primary})` }}
                            onMouseEnter={e => e.currentTarget.style.background = accent}
                            onMouseLeave={e => e.currentTarget.style.background = `var(--dc-guild-button, ${primary})`}
                        />
                    </div>
                </div>
                <div className="colorwayPreview-channels" style={{ background: `var(--dc-overlay-3, ${secondary})` }}>
                    <div
                        className="colorwayPreview-userArea"
                        style={{
                            background: `var(--dc-secondary-alt, hsl(${HexToHSL(secondary)[0]} ${HexToHSL(secondary)[1]}% ${Math.max(HexToHSL(secondary)[2] - 3.6, 0)}%))`
                        }}
                    />
                    <div className="colorwayPreview-filler">
                        <div className="colorwayPreview-channel" style={{ backgroundColor: "var(--white-500)" }} />
                        <div className="colorwayPreview-channel" style={{ backgroundColor: "var(--primary-360)" }} />
                        <div className="colorwayPreview-channel" style={{ backgroundColor: "var(--primary-500)" }} />
                    </div>
                    <div
                        className="colorwayPreview-topShadow"
                        style={{
                            "--primary-900-hsl": `${HexToHSL(tertiary)[0]} ${HexToHSL(tertiary)[1]}% ${Math.max(HexToHSL(tertiary)[2] - (3.6 * 6), 0)}%`,
                            "--primary-500-hsl": `${HexToHSL(primary)[0]} ${HexToHSL(primary)[1]}% ${Math.min(HexToHSL(primary)[2] + (3.6 * 3), 100)}%`
                        } as React.CSSProperties}
                    >
                        <span style={{
                            fontWeight: 700,
                            color: "var(--text-normal)"
                        }}>
                            Preview
                        </span>
                    </div>
                </div>
                <div className="colorwayPreview-chat" style={{ background: `var(--dc-overlay-chat, ${primary})` }}>
                    <div
                        className="colorwayPreview-chatBox"
                        style={{
                            background: `var(--dc-overlay-3, hsl(${HexToHSL(primary)[0]} ${HexToHSL(primary)[1]}% ${Math.min(HexToHSL(primary)[2] + 3.6, 100)}%))`
                        }}
                    />
                    <div className="colorwayPreview-filler" />
                    <div
                        className="colorwayPreview-topShadow"
                    />
                </div>
            </div>
        </div>
    </>;
}
