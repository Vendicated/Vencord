/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { filters, mapMangledModuleLazy } from "@webpack";
import type { ComponentType, CSSProperties, ReactNode } from "react";

export type NoticeType = "warn" | "info" | "danger" | "positive" | "preview";

export const NoticeTypes: Record<"WARNING" | "INFO" | "ERROR" | "POSITIVE" | "PREVIEW", NoticeType> = {
    WARNING: "warn",
    INFO: "info",
    ERROR: "danger",
    POSITIVE: "positive",
    PREVIEW: "preview"
};

const { HelpMessage } = mapMangledModuleLazy('POSITIVE="positive"', {
    HelpMessage: filters.byCode(".iconDiv")
});

export interface NoticeProps {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    icon?: ComponentType<{ className?: string; color?: string; }>;
    action?: ReactNode;
    textColor?: string;
    textVariant?: string;
    hidden?: boolean;
}

function Warning({ children, className, style, icon, action, textColor, textVariant, hidden }: NoticeProps) {
    return (
        <HelpMessage messageType={NoticeTypes.WARNING} className={className} style={style} icon={icon} action={action} textColor={textColor} textVariant={textVariant} hidden={hidden}>
            {children}
        </HelpMessage>
    );
}

function Info({ children, className, style, icon, action, textColor, textVariant, hidden }: NoticeProps) {
    return (
        <HelpMessage messageType={NoticeTypes.INFO} className={className} style={style} icon={icon} action={action} textColor={textColor} textVariant={textVariant} hidden={hidden}>
            {children}
        </HelpMessage>
    );
}

function Error({ children, className, style, icon, action, textColor, textVariant, hidden }: NoticeProps) {
    return (
        <HelpMessage messageType={NoticeTypes.ERROR} className={className} style={style} icon={icon} action={action} textColor={textColor} textVariant={textVariant} hidden={hidden}>
            {children}
        </HelpMessage>
    );
}

function Positive({ children, className, style, icon, action, textColor, textVariant, hidden }: NoticeProps) {
    return (
        <HelpMessage messageType={NoticeTypes.POSITIVE} className={className} style={style} icon={icon} action={action} textColor={textColor} textVariant={textVariant} hidden={hidden}>
            {children}
        </HelpMessage>
    );
}

export const Notice = {
    Warning,
    Info,
    Error,
    Positive
};
