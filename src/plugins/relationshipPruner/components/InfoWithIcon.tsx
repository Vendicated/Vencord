/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Text } from "@webpack/common";

import { cl } from "../index";

export function InfoWithIcon(props)
{
    const { svg, children } = props;
    return (
        <div className={cl("infowithicon")}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d={svg}/></svg>
            <Text color="header-primary" variant="heading-md/semibold">{children}</Text>
        </div>
    );
}
