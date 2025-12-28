/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./pluginCards.css";

import { isPluginEnabled, isPluginRequired } from "@api/PluginManager";
import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { WarningIcon } from "@components/Icons";
import { AddonCard } from "@components/settings";
import { ExcludedReasons, PluginDependencyList } from "@components/settings/tabs/plugins";
import { PluginCard } from "@components/settings/tabs/plugins/PluginCard";
import { TooltipContainer } from "@components/TooltipContainer";
import { EQUIBOT_USER_ID } from "@utils/constants";
import { isEquicordGuild, isEquicordSupport } from "@utils/misc";
import { Message } from "@vencord/discord-types";
import { showToast, Tooltip, useMemo } from "@webpack/common";
import { JSX } from "react";

import plugins, { ExcludedPlugins } from "~plugins";

export function ChatPluginCard({ url, description }: { url: string, description: string; }) {
    const pluginNameFromUrl = new URL(url).pathname.split("/")[2];

    const actualPluginName = Object.keys(plugins).find(name =>
        name.toLowerCase() === pluginNameFromUrl?.toLowerCase()
    );

    const pluginName = actualPluginName || pluginNameFromUrl;

    useSettings([`plugins.${pluginName ?? ""}.enabled`]);

    if (!pluginName) return null;

    const p = plugins[pluginName];
    const excludedPlugin = ExcludedPlugins[pluginName];

    if (excludedPlugin || !p) {
        const toolTipText = excludedPlugin
            ? `${pluginName} is only available on the ${ExcludedReasons[ExcludedPlugins[pluginName]]}`
            : "This plugin is not on this version of Equicord. Try updating!";

        const card = (
            <AddonCard
                name={pluginName}
                description={description || toolTipText}
                enabled={false}
                setEnabled={() => { }}
                disabled={true}
                infoButton={<WarningIcon />}
            />
        );

        return description
            ? <TooltipContainer text={toolTipText}>{card}</TooltipContainer>
            : card;
    }

    const onRestartNeeded = () => showToast("A restart is required for the change to take effect!");

    const depMap = useMemo(() => {
        const o = {} as Record<string, string[]>;
        for (const plugin in plugins) {
            const deps = plugins[plugin].dependencies;
            if (deps) {
                for (const dep of deps) {
                    o[dep] ??= [];
                    o[dep].push(plugin);
                }
            }
        }
        return o;
    }, []);

    const required = isPluginRequired(pluginName);
    const dependents = depMap[p.name]?.filter(d => isPluginEnabled(d));

    if (required) {
        const tooltipText = p.required || !dependents.length
            ? "This plugin is required for Equicord to function."
            : <PluginDependencyList deps={dependents} />;

        return (
            <Tooltip text={tooltipText} key={p.name}>
                {({ onMouseLeave, onMouseEnter }) =>
                    <PluginCard
                        key={p.name}
                        onMouseLeave={onMouseLeave}
                        onMouseEnter={onMouseEnter}
                        onRestartNeeded={onRestartNeeded}
                        plugin={p}
                        disabled
                    />
                }
            </Tooltip>
        );
    }

    return (
        <PluginCard
            key={p.name}
            onRestartNeeded={onRestartNeeded}
            plugin={p}
        />
    );
}

export const PluginCards = ErrorBoundary.wrap(function PluginCards({ message }: { message: Message; }) {
    const seenPlugins = new Set<string>();
    const pluginCards: JSX.Element[] = [];

    // Process embeds
    message.embeds?.forEach(embed => {
        if (!embed.url?.startsWith("https://equicord.org/plugins/") && !embed.url?.startsWith("https://vencord.dev/plugins/")) return;

        const isEquicord = isEquicordGuild(message.channel_id) && isEquicordSupport(message.author.id);
        if (!isEquicord) return;

        const pluginNameFromUrl = new URL(embed.url).pathname.split("/")[2];
        const actualPluginName = Object.keys(plugins).find(name =>
            name.toLowerCase() === pluginNameFromUrl?.toLowerCase()
        );
        const pluginName = actualPluginName || pluginNameFromUrl;

        if (!pluginName || seenPlugins.has(pluginName)) return;
        seenPlugins.add(pluginName);

        if (embed.rawDescription.startsWith("A fork that has")) embed.rawDescription = "";

        pluginCards.push(
            <ChatPluginCard
                key={embed.url}
                url={embed.url}
                description={embed.rawDescription}
            />
        );
    });

    // Process components
    const components = (message.components?.[0] as any)?.components;
    if (message.author.id === EQUIBOT_USER_ID && components?.length >= 4) {
        const description = components[1]?.content;
        const pluginUrl = components.find((c: any) => c?.components)?.components[0]?.url;
        if (pluginUrl?.startsWith("https://equicord.org/plugins/") || pluginUrl?.startsWith("https://vencord.dev/plugins/")) {
            const pluginNameFromUrl = new URL(pluginUrl).pathname.split("/")[2];
            const actualPluginName = Object.keys(plugins).find(name =>
                name.toLowerCase() === pluginNameFromUrl?.toLowerCase()
            );
            const pluginName = actualPluginName || pluginNameFromUrl;

            if (pluginName && !seenPlugins.has(pluginName)) {
                seenPlugins.add(pluginName);
                pluginCards.push(
                    <ChatPluginCard
                        key={pluginUrl}
                        url={pluginUrl}
                        description={description}
                    />
                );
            }
        }
    }

    if (pluginCards.length === 0) return null;

    return (
        <div className="vc-plugins-management-cards vc-plugins-grid" style={{ marginTop: "0px" }}>
            {pluginCards}
        </div>
    );
}, { noop: true });
