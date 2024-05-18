/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalProps, ModalRoot, openModal } from "@utils/modal";
import {
    Forms,
    Text
} from "@webpack/common";

import { HexToHSL } from "../utils";
import { CloseIcon } from "./Icons";

export default function ({
    accent,
    primary,
    secondary,
    tertiary,
    className,
    isCollapsed,
    previewCSS,
    noContainer
}: {
    accent: string,
    primary: string,
    secondary: string,
    tertiary: string,
    className?: string,
    isCollapsed: boolean,
    previewCSS?: string,
    noContainer?: boolean;
}) {
    function ThemePreview({
        accent,
        primary,
        secondary,
        tertiary,
        isModal,
        modalProps
    }: {
        accent: string,
        primary: string,
        secondary: string,
        tertiary: string,
        isModal?: boolean,
        modalProps?: ModalProps;
    }) {
        return (
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
                                        openModal((props: ModalProps) => <ModalRoot className="colorwaysPreview-modal" {...props}>
                                            <style>
                                                {previewCSS}
                                            </style>
                                            <ThemePreview accent={accent} primary={primary} secondary={secondary} tertiary={tertiary} isModal modalProps={props} />
                                        </ModalRoot>);
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
                        <div className="colorwayPreview-filler" />
                        <div
                            className="colorwayPreview-topShadow"
                            style={{
                                "--primary-900-hsl": `${HexToHSL(tertiary)[0]} ${HexToHSL(tertiary)[1]}% ${Math.max(HexToHSL(tertiary)[2] - (3.6 * 6), 0)}%`,
                                "--primary-500-hsl": `${HexToHSL(primary)[0]} ${HexToHSL(primary)[1]}% ${Math.min(HexToHSL(primary)[2] + (3.6 * 3), 100)}%`
                            } as React.CSSProperties}
                        >
                            <Text
                                tag="div"
                                variant="text-md/semibold"
                                lineClamp={1}
                                selectable={false}
                            >
                                Preview
                            </Text>
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
        );
    }
    return (
        !noContainer ? <div className="colorwaysPreview">
            <Forms.FormTitle
                style={{ marginBottom: 0 }}
            >
                Preview
            </Forms.FormTitle>
            <style>
                {previewCSS}
            </style>
            <ThemePreview
                accent={accent}
                primary={primary}
                secondary={secondary}
                tertiary={tertiary}
            />
        </div> : <>
            <style>
                {".colorwaysPreview-wrapper {color: var(--header-secondary); box-shadow: var(--legacy-elevation-border);}" + previewCSS}
            </style>
            <ThemePreview
                accent={accent}
                primary={primary}
                secondary={secondary}
                tertiary={tertiary}
            />
        </>
    );
}
