/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./FormSwitch.css";

import { classes } from "@utils/misc";
import { Text } from "@webpack/common";
import type { PropsWithChildren, ReactNode } from "react";

import { FormDivider } from "./FormDivider";
import { Switch } from "./Switch";

export interface FormSwitchProps {
    title: ReactNode;
    description?: ReactNode;
    value: boolean;
    onChange(value: boolean): void;

    className?: string;
    disabled?: boolean;
    hideBorder?: boolean;
}

export function FormSwitch({ onChange, title, value, description, disabled, className, hideBorder }: FormSwitchProps) {
    return (
        <div className="vc-form-switch-wrapper">
            <div className={classes("vc-form-switch", className, disabled && "vc-form-switch-disabled")}>
                <div className={"vc-form-switch-text"}>
                    <Text variant="text-md/medium">{title}</Text>
                    {description && <Text variant="text-sm/normal">{description}</Text>}
                </div>

                <Switch checked={value} onChange={onChange} disabled={disabled} />
            </div>
            {!hideBorder && <FormDivider className="vc-form-switch-border" />}
        </div>
    );
}

/** Compatibility with Discord's old FormSwitch */
export function FormSwitchCompat(props: PropsWithChildren<any>) {
    return <FormSwitch {...props} title={props.children ?? ""} description={props.note} />;
}
