import definePlugin from "../utils/types";
import { Channel } from "discord-types/general";
import { findByProps } from "../webpack";
import { FluxDispatcher } from "../webpack/common";

// Just remove VIEW_CHANNEL from the permission overrides of the channel
// There are probably better ways to do it but idk

var can = (a, b) => null;
var isLoaded = false;
var channelQueue: Channel[] = [];

const VIEW_CHANNEL = 1024n;
const CONNECT = 1048576n;

const processChannel = (t: Channel) => {
    if(!t.guild_id) return;
    if (!isLoaded)
    {
        channelQueue.push(t);
        return;
    }

    if (!can(VIEW_CHANNEL, t))
    {
        Object.values(t.permissionOverwrites).forEach(e => {
            if (e.deny & VIEW_CHANNEL)
            {
                e.deny -= VIEW_CHANNEL;
            }
        });
        if (t.type != 4) // If channel is not a category
        {
            // Transform the channel into a voice channel and disable "CONNECT"
            // It's to show the "locked" icon on the channel
            // This is a bit hacky but it works
            t.type = 2;
            Object.values(t.permissionOverwrites).forEach(e => {
                e.deny = CONNECT;
                e.allow = VIEW_CHANNEL;
            });
        }
    }

}

export default definePlugin({
    name: "Channels Reveler",
    description: "Reveal the channels you're not allowed to see.",
    authors: [
        {
            name: "BigDuck",
            id: 1024588272623681609n
        }
    ],
    patches: [
        {
            find: "D[e.id]=e;",
            replacement: {
                // Inside of the function called on every channel
                match: /D\[e\.id\]\=e\;/g,
                replace: 'Vencord.Plugins.plugins["Channels Reveler"].processChannel(e);D[e.id]=e;'
            }
        },
    ],
    start: () => {
        // "can" is not initialized when the cached channels are processed
        can = findByProps("can", "initialize").can;
        isLoaded = true;
        channelQueue.forEach(processChannel);
        // you need to dispatch a channel update (i think Discord caches channels somewhere else)
        FluxDispatcher.dispatch({
            type: "CHANNEL_UPDATES",
            updates: channelQueue.map(channel => ({ channel }))
        });
        channelQueue = [];
    },
    processChannel

});
