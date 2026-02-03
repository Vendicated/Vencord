/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import {
    Menu,
    PermissionsBits,
    PermissionStore,
    React,
    Toasts,
    UserStore
} from "@webpack/common";
import type { PropsWithChildren, SVGProps } from "react";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

interface BaseIconProps extends IconProps {
    viewBox: string;
}

interface IconProps extends SVGProps<SVGSVGElement> {
    className?: string;
    height?: string | number;
    width?: string | number;
}

function Icon({
    height = 24,
    width = 24,
    className,
    children,
    viewBox,
    ...svgProps
}: PropsWithChildren<BaseIconProps>) {
    return (
        <svg
            className={classes(className, "vc-icon")}
            role="img"
            width={width}
            height={height}
            viewBox={viewBox}
            {...svgProps}
        >
            {children}
        </svg>
    );
}

function UnmuteIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-unmute-icon")}
            viewBox="0 -960 960 960"
        >
            <path
                fill="currentColor"
                d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35ZM240-160v-80h120l120-120v-200q0-83 58.5-141.5T680-760q83 0 141.5 58.5T880-560v200l120 120h120v80H240Zm240-200Zm0-240q-33 0-56.5 23.5T400-720v240q0 33 23.5 56.5T480-400q33 0 56.5-23.5T560-480v-240q0-33-23.5-56.5T480-800Z"
            />
        </Icon>
    );
}

function MuteIcon(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-mute-icon")}
            viewBox="0 -960 960 960"
        >
            <path
                fill="currentColor"
                d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35ZM240-160v-80h120l120-120v-200q0-83 58.5-141.5T680-760q83 0 141.5 58.5T880-560v200l120 120h120v80H240Zm240-200Zm0-240q-33 0-56.5 23.5T400-720v240q0 33 23.5 56.5T480-400q33 0 56.5-23.5T560-480v-240q0-33-23.5-56.5T480-800Z"
            />
        </Icon>
    );
}

export const settings = definePluginSettings({
    autoUnmute: {
        type: OptionType.BOOLEAN,
        description: "Automatically unmute when server muted",
        restartNeeded: false,
        default: true
    },
    autoUndeafen: {
        type: OptionType.BOOLEAN,
        description: "Automatically undeafen when server deafened",
        restartNeeded: false,
        default: true
    },
    showNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show notifications when auto-unmuting/undeafening",
        restartNeeded: false,
        default: true
    },
    delayBeforeUnmute: {
        type: OptionType.SLIDER,
        description: "Delay before auto-unmuting (seconds)",
        restartNeeded: false,
        default: 0.1,
        markers: [0, 0.1, 0.5, 1, 2],
        stickToMarkers: false
    }
});

export default definePlugin({
    name: "AutoUnmute",
    description: "Automatically unmutes/undeafens you when server muted or deafened",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    settings,

    patches: [
        {
            find: "toolbar:function",
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,100}mobileToolbar)/,
                replace: "$1$self.addIconToToolBar(arguments[0]);$2"
            }
        },
        // Patch the voice state update to immediately remove server mute/deafen
        {
            find: "setMute:function",
            replacement: {
                match: /setMute:function\((\w+),(\w+),(\w+)\){/,
                replace: "setMute:function($1,$2,$3){$self.handleVoiceStateUpdate('mute',$1,$2,$3);"
            }
        },
        {
            find: "setDeaf:function",
            replacement: {
                match: /setDeaf:function\((\w+),(\w+),(\w+)\){/,
                replace: "setDeaf:function($1,$2,$3){$self.handleVoiceStateUpdate('deaf',$1,$2,$3);"
            }
        }
    ],

    // Handle voice state updates
    handleVoiceStateUpdate(type: string, guildId: string, userId: string, value: boolean) {
        try {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser || userId !== currentUser.id) return;

            // If server mute/deafen is being applied, remove it immediately
            if (value === true) {
                const delay = settings.store.delayBeforeUnmute * 1000;

                setTimeout(async () => {
                    try {
                        if (type === 'mute' && settings.store.autoUnmute) {
                            console.log("Auto-removing server mute...");

                            // Find and use the original setMute function
                            const originalSetMute = this.originalSetMute;
                            if (originalSetMute) {
                                await originalSetMute(guildId, userId, false);
                            }

                            if (settings.store.showNotifications) {
                                Toasts.show({
                                    message: "Auto-unmute: Server mute removed",
                                    id: Toasts.genId(),
                                    type: Toasts.Type.SUCCESS
                                });
                            }
                        }

                        if (type === 'deaf' && settings.store.autoUndeafen) {
                            console.log("Auto-removing server deafen...");

                            // Find and use the original setDeaf function
                            const originalSetDeaf = this.originalSetDeaf;
                            if (originalSetDeaf) {
                                await originalSetDeaf(guildId, userId, false);
                            }

                            if (settings.store.showNotifications) {
                                Toasts.show({
                                    message: "Auto-undeafen: Server deafen removed",
                                    id: Toasts.genId(),
                                    type: Toasts.Type.SUCCESS
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`Error auto-removing ${type}:`, error);
                        if (settings.store.showNotifications) {
                            Toasts.show({
                                message: `Auto-${type === 'mute' ? 'unmute' : 'undeafen'} failed`,
                                id: Toasts.genId(),
                                type: Toasts.Type.FAILURE
                            });
                        }
                    }
                }, delay);
            }
        } catch (error) {
            console.error("Error in handleVoiceStateUpdate:", error);
        }
    },

    AutoUnmuteIndicator() {
        const { plugins: { AutoUnmute: { autoUnmute, autoUndeafen } } } = useSettings(["plugins.AutoUnmute.autoUnmute", "plugins.AutoUnmute.autoUndeafen"]);

        if (autoUnmute || autoUndeafen) {
            return (
                <HeaderBarIcon
                    tooltip={`Auto-Unmute: ${autoUnmute ? 'ON' : 'OFF'} | Auto-Undeafen: ${autoUndeafen ? 'ON' : 'OFF'}`}
                    icon={MuteIcon}
                    onClick={() => {
                        // Manual trigger
                        if (settings.store.showNotifications) {
                            Toasts.show({
                                message: "Auto-Unmute Plugin Active",
                                id: Toasts.genId(),
                                type: Toasts.Type.INFO
                            });
                        }
                    }}
                />
            );
        }

        return null;
    },

    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar)) {
            return e.toolbar.unshift(
                <ErrorBoundary noop={true} key="auto-unmute-indicator">
                    <this.AutoUnmuteIndicator/>
                </ErrorBoundary>
            );
        }

        e.toolbar = [
            <ErrorBoundary noop={true} key="auto-unmute-indicator">
                <this.AutoUnmuteIndicator />
            </ErrorBoundary>,
            e.toolbar,
        ];
    },
});
