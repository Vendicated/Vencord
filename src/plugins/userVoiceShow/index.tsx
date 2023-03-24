import { definePluginSettings } from "@api/settings";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore } from "@webpack/common";
import { VoiceChannelField } from "./components/VoiceChannelField";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

const settings = definePluginSettings({
  showInUserProfileModal: {
    type: OptionType.BOOLEAN,
    description: "Show a user's voice channel in their profile modal",
    default: true,
  }
});

export default definePlugin({
  name: "User Voice Show",
  description: "See the channel a user is sitting in and click join that channel",
  authors: [
    {
      id: 319460781567639554n,
      name: "LordElias",
    },
  ],
  settings,

  getVoiceChannelField(props: any, origin: string) {
    if (origin == "modal" && !settings.store.showInUserProfileModal) return;

    //console.log(e);
    const { user } = props;
    const { channelId } = VoiceStateStore.getVoiceStateForUser(user.id) ?? {};
    if (!channelId) return;
    const channel = ChannelStore.getChannel(channelId);
    const guild = GuildStore.getGuild(channel.guild_id);

    const result = `${guild.name} | ${channel.name}`;
    //console.log(result);

    return (
      <VoiceChannelField
        channel={channel}
        label={result}
      />
    );
  },

  patches: [
    {
      find: ".showCopiableUsername",
      replacement: {
        // $1: argument name (currently "e")
        // $2: the rest inbetween the argument name and my actual match
        // $3: my actual match
        match: /(?<=function \w+\()(\w)(.*)(\(0,\w\.jsx\))(?=(.(?!\3))+?canDM)/,
        // paste my fancy custom button above the message field
        replace: `$1$2$self.getVoiceChannelField($1, "popout"),$3`,
      }
    },
    {
      find: ".USER_PROFILE_MODAL",
      replacement: {
        // $1: argument name (currently "e")
        // $2: the rest inbetween the argument name and my actual match
        // $3: my actual match
        match: /(?<=function \w+\()(\w)(.*)((\(0,\w\.jsx\))(.(?!\4))+?user:\w{1,2}}\))/,
        // paste my fancy custom button above the message field
        replace: `$1$2$3,$self.getVoiceChannelField($1, "modal")`,
      }
    }
  ],
  // Delete these two below if you are only using code patches
  start() {

  },
  stop() {

  },
});
