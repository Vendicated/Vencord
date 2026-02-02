/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Ping.css";

import { FluxEvent, TextVariant } from "@vencord/discord-types";
import { FluxDispatcher, useEffect, useState } from "@webpack/common";


import { RTCConnectionStore } from "../stores";
import { TextCompat } from "@components/BaseText";

export function PingElement({ variant, parenthesis = true, color }: { variant: TextVariant; parenthesis?: boolean; color?: string; }) {
    const [ping, setPing] = useState(() => RTCConnectionStore.getLastPing());

    const formatPing = (ping: number | undefined) => {
        if (ping === undefined) return "N/A";
        return parenthesis ? `(${ping} ms)` : `${ping} ms`;
    };

    useEffect(() => {
        const updatePing = (_: FluxEvent) => {
            setPing(RTCConnectionStore.getLastPing());
        };
        FluxDispatcher.subscribe("RTC_CONNECTION_PING", updatePing);
        return () => {
            FluxDispatcher.unsubscribe("RTC_CONNECTION_PING", updatePing);
        };
    }, []);

    return (<TextCompat variant={variant} className="pingDisplay" style={{ color: color ?? "inherit" }}>{formatPing(ping)}</TextCompat>);
}
