/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Card, Text } from "@webpack/common";

interface EmptyStateProps {
    text: string;
}

export function EmptyState(props: EmptyStateProps) {
    return (
        <Card style={{ padding: "36px", display: "flex", justifyContent: "center" }}>
            <Text>{props.text}</Text>
        </Card>
    );
}
