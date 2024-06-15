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

import type { ChannelRecord } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Button, Forms, Permissions, PermissionStore, Toasts } from "@webpack/common";

const SelectedChannelActionCreators = findByPropsLazy("selectChannel", "selectVoiceChannel");
const UserPopoutSection = findByCodeLazy(".lastSection", "children:");

interface VoiceChannelFieldProps {
    channel: ChannelRecord;
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
                if (PermissionStore.can(Permissions.CONNECT, channel))
                    SelectedChannelActionCreators.selectVoiceChannel(channel.id);
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
