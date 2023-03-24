import { findByPropsLazy } from "@webpack";
import { PermissionStore, Toasts } from "@webpack/common";
import { Channel } from "discord-types/general";

import "./VoiceChannelField.css";

const ChannelActions = findByPropsLazy("selectChannel", "selectVoiceChannel");

const CONNECT = 1n << 20n;

type VoiceChannelFieldProps = {
  channel: Channel;
  label: string;
};

export const VoiceChannelField = ({ channel, label }: VoiceChannelFieldProps) => (
  <div
    className="voiceChannelField"
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
  >{label}</div>
);
