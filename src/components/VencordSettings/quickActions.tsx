/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// this code is horrible this code is horrible this code is horrible this code is horrible this code is horrible this code is horrible this code is horrible this code is horrible
// - love, jae
// (seriously though what the fuck how does react work)

import "./quickActions.css";

import { classNameFactory } from "@api/Styles";
import { InfoIcon } from "@components/Icons";
import { classes } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { Alerts, Card, Text } from "@webpack/common";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

const cl = classNameFactory("vc-settings-quickActions-");
const ButtonClasses = findByPropsLazy("button", "disabled", "enabled");

export interface QuickActionProps {
    Icon: ComponentType<{ className?: string; }>;
    text: ReactNode;
    action?: () => void;
    disabled?: boolean;
}
interface QuickActionContainerProps {
    title: string;
}

export function QuickAction(props: QuickActionProps) {
    const { Icon, action, text, disabled } = props;

    return (
        <button className={cl("button")} onClick={action} disabled={disabled}>
            <Icon className={cl("img")} />
            {text}
        </button>
    );
}

export function QuickActionContainer({ title, children }: PropsWithChildren<QuickActionContainerProps>) {
    return (
        <Card className={cl("container")}>
            <Text className={cl("title")} variant="heading-md/bold">
                {title}
                <button
                    role="switch"
                    onClick={() => {
                        Alerts.show({
                            title: "Very Important Button",
                            body: (
                                <>
                                    <p>this corner looked empty so we put an info button here</p>
                                    <img src="https://media.discordapp.net/stickers/1258484151670018220.gif"></img>
                                </>
                            ),
                            confirmText: "Okiiiii :3",
                            cancelText: "Shut Up",
                            onConfirm: () => console.log("sigma or sugma?")
                        });
                    }}
                    className={classes(ButtonClasses.button, cl("info-button"))}
                >
                    <InfoIcon />
                </button>
            </Text>
            <span className={cl("containerButtons")}>{children}</span>
        </Card>
    );
}
