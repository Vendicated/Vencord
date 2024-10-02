/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Text, Tooltip } from "@webpack/common";

export function StockPluginsCard({ totalStockPlugins, enabledStockPlugins }) {
    return (
        <div className="vc-plugin-stats vc-stockplugins-stats-card">
            <div className="vc-plugin-stats-card-container">
                <div className="vc-plugin-stats-card-section">
                    <Text variant="text-md/semibold">Enabled Plugins</Text>
                    <Text variant="heading-xl/bold">{enabledStockPlugins}</Text>
                </div>
                <div className="vc-plugin-stats-card-divider"></div>
                <div className="vc-plugin-stats-card-section">
                    <Text variant="text-md/semibold">Total Plugins</Text>
                    <Text variant="heading-xl/bold">{totalStockPlugins}</Text>
                </div>
            </div>
        </div>
    );
}

export function UserPluginsCard({ totalUserPlugins, enabledUserPlugins }) {
    if (totalUserPlugins <= 1)
        return (
            <div className="vc-plugin-stats vc-stockplugins-stats-card">
                <div className="vc-plugin-stats-card-container ">
                    <div className="vc-plugin-stats-card-section">
                        <Text variant="text-md/semibold">Total UserPlugins</Text>
                        <Tooltip
                            text={
                                <img
                                    src="https://discord.com/assets/ab6835d2922224154ddf.svg"
                                    style={{ width: "40px", height: "40px" }}
                                />
                            }
                        >
                            {tooltipProps => (
                                <span style={{ display: "inline", position: "relative" }}>
                                    <Text variant="heading-xl/bold" {...tooltipProps}>
                                        {totalUserPlugins}
                                    </Text>
                                </span>
                            )}
                        </Tooltip>
                    </div>
                </div>
            </div>
        );
    else
        return (
            <div className="vc-plugin-stats vc-stockplugins-stats-card">
                <div className="vc-plugin-stats-card-container">
                    <div className="vc-plugin-stats-card-section">
                        <Text variant="text-md/semibold">Enabled UserPlugins</Text>
                        <Text variant="heading-xl/bold">{enabledUserPlugins}</Text>
                    </div>
                    <div className="vc-plugin-stats-card-divider"></div>
                    <div className="vc-plugin-stats-card-section">
                        <Text variant="text-md/semibold">Total UserPlugins</Text>
                        <Text variant="heading-xl/bold">{totalUserPlugins}</Text>
                    </div>
                </div>
            </div>
        );
}
