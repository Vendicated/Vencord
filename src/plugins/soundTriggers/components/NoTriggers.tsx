/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Card, Text } from "@webpack/common";

interface NoTriggersProps {
    text?: string;
}

export function NoTriggers(props: NoTriggersProps) {
    return (
        <Card style={{ padding: "36px", display: "flex", justifyContent: "center" }}>
            <Text>{props.text ?? "No triggers."}</Text>
        </Card>
    );
}
