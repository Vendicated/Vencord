/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { filters, mapMangledModuleLazy } from "@webpack";
import type { ComponentType, CSSProperties, ReactNode } from "react";

const { HelpMessage, HelpMessageTypes } = mapMangledModuleLazy('POSITIVE="positive', {
    HelpMessageTypes: filters.byProps("POSITIVE", "WARNING", "INFO", "ERROR"),
    HelpMessage: filters.byCode(".iconDiv")
});

export interface AlertProps {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    icon?: ComponentType<{ className?: string; color?: string; }>;
}

function Warning({ children, className, style, icon }: AlertProps) {
    return (
        <HelpMessage messageType={HelpMessageTypes.WARNING} className={className} style={style} icon={icon}>
            {children}
        </HelpMessage>
    );
}

function Info({ children, className, style, icon }: AlertProps) {
    return (
        <HelpMessage messageType={HelpMessageTypes.INFO} className={className} style={style} icon={icon}>
            {children}
        </HelpMessage>
    );
}

function Error({ children, className, style, icon }: AlertProps) {
    return (
        <HelpMessage messageType={HelpMessageTypes.ERROR} className={className} style={style} icon={icon}>
            {children}
        </HelpMessage>
    );
}

function Positive({ children, className, style, icon }: AlertProps) {
    return (
        <HelpMessage messageType={HelpMessageTypes.POSITIVE} className={className} style={style} icon={icon}>
            {children}
        </HelpMessage>
    );
}

export const Alert = {
    Warning,
    Info,
    Error,
    Positive
};
