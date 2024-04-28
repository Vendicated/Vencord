/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { classNameFactory } from "@api/Styles";
import { Button, ButtonLooks } from "@webpack/common";

const cl = classNameFactory("vc-hideservers-");

export default function ({ count, onClick, }: { count: number; onClick: () => void; }) {
    return (
        <div className={cl("button-wrapper")}>
            {count > 0 ? (
                <Button
                    className={cl("button")}
                    look={ButtonLooks.BLANK}
                    size={Button.Sizes.MIN}
                    onClick={onClick} >
                    {count} Hidden
                </Button>
            ) : null}
        </div>
    );
}
