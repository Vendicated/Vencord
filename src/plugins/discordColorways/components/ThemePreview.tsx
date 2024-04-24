/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CloseIcon } from "@components/Icons";
import { ModalProps, ModalRoot, openModal } from "@utils/modal";
import {
    Forms,
    Text,
    useState
} from "@webpack/common";

import { HexToHSL } from "../utils";

export default function ({
    accent,
    primary,
    secondary,
    tertiary,
    className,
    isCollapsed,
    previewCSS
}: {
    accent: string,
    primary: string,
    secondary: string,
    tertiary: string,
    className?: string,
    isCollapsed: boolean,
    previewCSS?: string;
}) {
    const [collapsed, setCollapsed] = useState<boolean>(isCollapsed);
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
                style={{ backgroundColor: tertiary }}
            >
                <div className="colorwaysPreview-titlebar" />
                <div className="colorwaysPreview-body">
                    <div className="colorwayPreview-guilds">
                        <div className="colorwayPreview-guild">
                            <div
                                className="colorwayPreview-guildItem"
                                style={{ backgroundColor: primary }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = accent}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = primary}
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
                                style={{ backgroundColor: primary }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = accent; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = primary; }}
                            />
                        </div>
                        <div className="colorwayPreview-guild">
                            <div
                                className="colorwayPreview-guildItem"
                                style={{ backgroundColor: primary }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = accent; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = primary; }}
                            />
                        </div>
                    </div>
                    <div className="colorwayPreview-channels" style={{ backgroundColor: secondary }}>
                        <div
                            className="colorwayPreview-userArea"
                            style={{
                                backgroundColor: "hsl(" + HexToHSL(secondary)[0] + " " + HexToHSL(secondary)[1] + "% " + Math.max(HexToHSL(secondary)[2] - 3.6, 0) + "%)"
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
                    <div className="colorwayPreview-chat" style={{ backgroundColor: primary }}>
                        <div
                            className="colorwayPreview-chatBox"
                            style={{
                                backgroundColor: "hsl(" + HexToHSL(primary)[0] + " " + HexToHSL(primary)[1] + "% " + Math.min(HexToHSL(primary)[2] + 3.6, 100) + "%)"
                            }}
                        />
                        <div className="colorwayPreview-filler" />
                        <div
                            className="colorwayPreview-topShadow"
                            style={{
                                "--primary-900-hsl": `${HexToHSL(tertiary)[0]} ${HexToHSL(tertiary)[1]}% ${Math.max(HexToHSL(tertiary)[2] - (3.6 * 6), 0)}%`
                            } as React.CSSProperties}
                        />
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className={`${collapsed ? "colorwaysPreview colorwaysPreview-collapsed" : "colorwaysPreview"} ${className || ""}`}>
            <div
                className="colorwaysCreator-settingItm colorwaysCreator-settingHeader"
                onClick={() => setCollapsed(!collapsed)}
            >
                <Forms.FormTitle
                    style={{ marginBottom: 0 }}
                >
                    Preview
                </Forms.FormTitle>
                <svg
                    className="expand-3Nh1P5 transition-30IQBn directionDown-2w0MZz"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    role="img"
                >
                    <path
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M7 10L12 15 17 10"
                        aria-hidden="true"
                    />
                </svg>
            </div>
            <style>
                {previewCSS}
            </style>
            <ThemePreview
                accent={accent}
                primary={primary}
                secondary={secondary}
                tertiary={tertiary}
            />
        </div>
    );
}

