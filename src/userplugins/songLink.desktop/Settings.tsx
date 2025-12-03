/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 nin0
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FormSwitch } from "@components/FormSwitch";
import { HeadingTertiary } from "@components/Heading";

import { settings } from ".";
import Providers from "./Providers";

export function Settings() {
    const blazinglyFastSettings = settings.use(["servicesSettings"]);

    return <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
    }}>
        {
            Object.entries(Providers).map(provider => <div key={provider[0]} style={{
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: 8
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                        src={provider[1].logo}
                        alt={`${provider[1].name} logo`}
                        style={{ width: 16, height: 16, objectFit: "contain", display: "block" }}
                    />
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <HeadingTertiary>{provider[1].name}</HeadingTertiary>
                    </div>
                </div>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4
                }}>
                    <FormSwitch
                        title="Show if available"
                        hideBorder={true}
                        key={`${provider[0]}-visible`}
                        value={blazinglyFastSettings.servicesSettings[provider[0]].enabled}
                        onChange={v => settings.store.servicesSettings[provider[0]].enabled = v}
                    />
                    {
                        /* @ts-ignore */
                        provider[1].native && <FormSwitch
                            title="Open in desktop app"
                            hideBorder={true}
                            key={`${provider[0]}-native`}
                            value={blazinglyFastSettings.servicesSettings[provider[0]].openInNative}
                            onChange={v => settings.store.servicesSettings[provider[0]].openInNative = v}
                        />
                    }
                </div>
            </div>)
        }
    </div>;
}
