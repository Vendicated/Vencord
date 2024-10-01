/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Text } from "@webpack/common";

export function StockPluginsCard({ totalStockPlugins, enabledStockPlugins }) {
    return (
        <div className="vc-plugin-stats vc-stockplugins-stats-card">
            <Text variant="text-md/bold">Enabled Stock Plugins</Text>
            <Text variant="heading-xxl/bold" style={{ textAlign: "center" }}>{enabledStockPlugins}</Text>
            <Text variant="text-sm/normal">Total Stock Plugins: {totalStockPlugins} </Text>
        </div>
    );
}

export function UserPluginsCard({ totalUserPlugins, enabledUserPlugins }) {
    return (
        <div className="vc-plugin-stats vc-userplugins-stats-card">
            <Text variant="text-md/bold">Enabled UserPlugins</Text>
            <Text variant="heading-xxl/bold" style={{ textAlign: "center" }}>{totalUserPlugins}</Text>
            <Text variant="text-sm/normal">Total UserPlugins: {enabledUserPlugins} </Text>
        </div>
    );
}
