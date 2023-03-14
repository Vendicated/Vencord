import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { WEBPACK_CHUNK } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore, Menu } from "@webpack/common";
import { findByProps, findByPropsLazy } from "@webpack";
import { definePluginSettings } from "@api/settings";


var userToken;

function getUserToken() {
    if (userToken) {
        return userToken;
    } else {
        let m;
        let token = (window[WEBPACK_CHUNK].push([[''], {}, e => { m = []; for (let c in e.c) m.push(e.c[c]); }]), m).find(m => m?.exports?.default?.getToken !== void 0).exports.default.getToken();
        if (token) {
            userToken = token;
            return token;
        }
    }

}


const settings = definePluginSettings({
    delay: {
        description: "Bulk Actions delay (milliseconds)",
        type: OptionType.NUMBER,
        default: 0,
        stickToMarkers: true,
    }
});

function sendPatch(channel, body, bypass = false) {
    var VoiceStateStore = findByPropsLazy("getVoiceStatesForChannel"); // Get Voice States Modules
    var patch = findByProps("V8APIError", "patch"); // Get patch modules
    var usersVoice = VoiceStateStore.getVoiceStatesForChannel(channel); // Get voice states by channel id
    const myId = UserStore.getCurrentUser().id; // Get my user id

    if (settings.store.delay == 0) {
        usersVoice.forEach(userVoice => {
            if (bypass || userVoice.member.userId != myId) {
                var patchPayload = {
                    url: "https://discord.com/api/v9/guilds/" + userVoice.member.guildId + "/members/" + userVoice.member.userId,
                    headers: {
                        authorization: getUserToken(),
                    }
                };
                patchPayload["body"] = body;

                patch.patch(patchPayload);
            }
        });
    } else {
        usersVoice.forEach((userVoice, index) => {
            if (bypass || userVoice.member.userId != myId) {
                setTimeout(() => {
                    var patchPayload = {
                        url: "https://discord.com/api/v9/guilds/" + userVoice.member.guildId + "/members/" + userVoice.member.userId,
                        headers: {
                            authorization: getUserToken(),
                        }
                    };
                    patchPayload["body"] = body;

                    patch.patch(patchPayload);
                }, index * settings.store.delay);

            }
        });
    }

}

const voiceChannelContextMenuPatch: NavContextMenuPatchCallback = (children, args) => {

    if (!args?.[0]) return;
    if (args[0].channel && !args[0].channel.bitrate_) { return; }

    var channels = findByProps("getChannels");
    const guildChannels = channels.getChannels(args[0].channel.guild_id);
    const voiceChannels = guildChannels.VOCAL.map(({ channel }) => channel);

    const group = findGroupChildrenByChildId("mute-channel", children);
    if (group && !group.some(child => child?.props?.id === "voice-tools")) {
        group.push((
            <Menu.MenuItem
                label="Voice Tools"
                key="voice-tools"
                id="voice-tools"
            >
                <Menu.MenuItem
                    key="voice-tools-disconnect-all"
                    id="voice-tools-disconnect-all"
                    label="Disconnect all"
                    action={() => sendPatch(args[0].channel, {
                        channel_id: null,
                    })}
                />

                <Menu.MenuItem
                    key="voice-tools-mute-all"
                    id="voice-tools-mute-all"
                    label="Mute all"
                    action={() => sendPatch(args[0].channel, {
                        mute: true,
                    })}
                />

                <Menu.MenuItem
                    key="voice-tools-unmute-all"
                    id="voice-tools-unmute-all"
                    label="Unmute all"
                    action={() => sendPatch(args[0].channel, {
                        mute: false,
                    })}
                />

                <Menu.MenuItem
                    key="voice-tools-deafen-all"
                    id="voice-tools-deafen-all"
                    label="Deafen all"
                    action={() => sendPatch(args[0].channel, {
                        deaf: true,
                    })}
                />

                <Menu.MenuItem
                    key="voice-tools-undeafen-all"
                    id="voice-tools-undeafen-all"
                    label="Undeafen all"
                    action={() => sendPatch(args[0].channel, {
                        deaf: false,
                    })}
                />

                <Menu.MenuItem
                    label="Move all"
                    key="voice-tools-move-all"
                    id="voice-tools-move-all"
                >

                    {voiceChannels.map((channel) => {
                        return (
                            <Menu.MenuItem
                                key={channel.id}
                                id={channel.id}
                                label={channel.name}
                                action={() => sendPatch(args[0].channel, {
                                    channel_id: channel.id,
                                }, true)}
                            />
                        );
                    })}

                </Menu.MenuItem>


            </Menu.MenuItem>
        ));
    }
};



export default definePlugin({
    name: "Voice Chat Utilities",
    description: "This plugin allows you to perform multiple actions on an entire channel (move, mute, disconnect, etc.)",
    authors: [
        {
            id: 769939285792653325n,
            name: "! 𝕯'𝖆𝖒𝖘 (ported to Vencord)",
        },
        {
            id: 1245n,
            name: "dutake (original code)"
        }

    ],
    settings,
    patches: [],
    // Delete these two below if you are only using code patches
    start() {
        addContextMenuPatch("channel-context", voiceChannelContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("channel-context", voiceChannelContextMenuPatch);
    },
});;;