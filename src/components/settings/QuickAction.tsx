/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./QuickAction.css";

import { classNameFactory } from "@api/Styles";
import { Card } from "@webpack/common";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

const cl = classNameFactory("vc-settings-quickActions-");

export interface QuickActionProps {
    Icon: ComponentType<{ className?: string; }>;
    text: ReactNode;
    action?: () => void;
    disabled?: boolean;
}

export function QuickAction(props: QuickActionProps) {
    const { Icon, action, text, disabled } = props;

    return (
        <button className={cl("pill")} onClick={action} disabled={disabled}>
            <Icon className={cl("img")} />
            {text}
        </button>
    );
}

export function QuickActionCard(props: PropsWithChildren) {
    return (
        <Card className={cl("card")}>
            {props.children}
        </Card>
    );
}
