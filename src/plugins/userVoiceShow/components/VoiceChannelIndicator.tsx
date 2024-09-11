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

import "./VoiceChannelIndicator.css";

import { NavigationRouter, PermissionsBits, PermissionStore, Toasts, Tooltip } from "@webpack/common";
import { Channel } from "discord-types/general";

import speakerSvg from "./speaker.svg";

interface VoiceChannelIndicatorProps {
  tooltipText?: string;
  channel: Channel;
}

export const VoiceChannelIndicator = ({ tooltipText, channel }: VoiceChannelIndicatorProps) => (
  <span className="vc-uvs-indicator" onClick={e => {
    if (PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel)) {
      NavigationRouter.transitionTo(getChannelPath(channel));
      e.preventDefault();
      e.stopPropagation();
    }
    else
      Toasts.show({
        message: "Insufficient permissions to view the channel.",
        id: "user-voice-show-insufficient-permissions",
        type: Toasts.Type.FAILURE,
        options: {
          position: Toasts.Position.BOTTOM,
        }
      });
  }}>
    <Tooltip text={tooltipText}>
      {(tooltipProps: any) => speakerSvg(tooltipProps)}
    </Tooltip>
  </span>
);

const getChannelPath = (c: Channel) => `/channels/${c.guild_id ?? "@me"}/${c.id}`;
