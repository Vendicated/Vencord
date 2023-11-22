/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./MediaName.css";

import { Forms } from "@webpack/common";
import { ReactElement } from "react";

export interface MediaNameProps {
    attachment: {
        filename: string;
    };
    renderImageComponent(props: any): ReactElement;
    renderVideoComponent(props: any): ReactElement;
}

export default function MediaName({ attachment: { filename } }: MediaNameProps) {
    return <Forms.FormTitle className="vc-advanced-messages-media-name">
        {filename}
    </Forms.FormTitle>;
}
