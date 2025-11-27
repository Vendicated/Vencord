/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { filters, mapMangledModuleLazy } from "@webpack";
import type { ReactNode } from "react";

const { HelpMessage, HelpMessageTypes } = mapMangledModuleLazy('POSITIVE="positive', {
    HelpMessageTypes: filters.byProps("POSITIVE", "WARNING", "INFO", "ERROR"),
    HelpMessage: filters.byCode(".iconDiv")
});

export interface AlertProps {
    children: ReactNode;
    className?: string;
}

function Warning({ children, className }: AlertProps) {
    return (
        <HelpMessage messageType={HelpMessageTypes.WARNING} className={className}>
            {children}
        </HelpMessage>
    );
}

function Info({ children, className }: AlertProps) {
    return (
        <HelpMessage messageType={HelpMessageTypes.INFO} className={className}>
            {children}
        </HelpMessage>
    );
}

function Error({ children, className }: AlertProps) {
    return (
        <HelpMessage messageType={HelpMessageTypes.ERROR} className={className}>
            {children}
        </HelpMessage>
    );
}

function Positive({ children, className }: AlertProps) {
    return (
        <HelpMessage messageType={HelpMessageTypes.POSITIVE} className={className}>
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
