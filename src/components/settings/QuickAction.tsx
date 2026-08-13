/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./QuickAction.css";

import { Card } from "@components/Card";
import { classNameFactory } from "@utils/css";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

const cl = classNameFactory("vc-settings-quickActions-");

export interface QuickActionProps {
    Icon: ComponentType<{ className?: string; }>;
    text: ReactNode;
    action?: () => void;
    disabled?: boolean;
    style?: React.CSSProperties;
}

export function QuickAction(props: QuickActionProps) {
    const { Icon, action, text, disabled, style } = props;

    return (
        <button className={cl("pill")} onClick={action} disabled={disabled} style={style}>
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
