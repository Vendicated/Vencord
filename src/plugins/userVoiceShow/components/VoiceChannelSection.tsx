/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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
