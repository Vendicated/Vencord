/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@webpack/common";
import React from "react";

import { Tool } from "./RemixModal";

function ToolButton({ children, name, onClick, active }: { children, name: Tool; onClick: (tool: Tool) => void; active: boolean; }) {
    return (
        <Button
            className={"remix-control" + (active ? " active" : "")}
            onClick={() => onClick(name)}
            color={Button.Colors.BRAND}
        >
            <svg
                viewBox="0 0 24 24"
                height="24"
                width="24"
            >
                {children}
            </svg>
        </Button>
    );
}

export default ToolButton;
