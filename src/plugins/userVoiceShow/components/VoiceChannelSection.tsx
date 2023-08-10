/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./VoiceChannelSection.css";

import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Button, Forms, PermissionStore, Toasts } from "@webpack/common";
import { Channel } from "discord-types/general";

const ChannelActions = findByPropsLazy("selectChannel", "selectVoiceChannel");
const UserPopoutSection = findByCodeLazy(".lastSection", ".children");

const CONNECT = 1n << 20n;

interface VoiceChannelFieldProps {
    channel: Channel;
    label: string;
    showHeader: boolean;
}

export const VoiceChannelSection = ({ channel, label, showHeader }: VoiceChannelFieldProps) => (
    <UserPopoutSection>
        {showHeader && <Forms.FormTitle className="vc-uvs-header">In a voice channel</Forms.FormTitle>}
        <Button
            className="vc-uvs-button"
            color={Button.Colors.TRANSPARENT}
            size={Button.Sizes.SMALL}

            onClick={() => {
                if (PermissionStore.can(CONNECT, channel))
                    ChannelActions.selectVoiceChannel(channel.id);
                else
                    Toasts.show({
                        message: "Insufficient permissions to enter the channel.",
                        id: "user-voice-show-insufficient-permissions",
                        type: Toasts.Type.FAILURE,
                        options: {
                            position: Toasts.Position.BOTTOM,
                        }
                    });
            }}
        >
            {label}
        </Button>
    </UserPopoutSection>
);
