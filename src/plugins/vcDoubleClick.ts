import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";

const timers = {} as Record<string, {
    timeout?: NodeJS.Timeout;
    i: number;
}>;

export default definePlugin({
    name: "vcDoubleClick",
    description: "Join VCs via DoubleClick instead of single click",
    authors: [Devs.Ven],
    patches: [
        {
            find: "VoiceChannel.renderPopout",
            replacement: {
                match: /onClick:function\(\)\{(e\.handleClick.+?)}/g,
                // hack: this is not a react onClick, it is a custom prop handled by Discord
                // thus, replacin this with onDoubleClick won't work and you also cannot check
                // e.detail since instead of the event they pass the channel.
                // do this timer workaround instead
                replace: "onClick:function(){Vencord.Plugins.plugins.vcDoubleClick.schedule(()=>{$1}, e)}",
            },
        },
        {
            find: 'className:"channelMention",iconType:(',
            replacement: {
                match: /onClick:(.{1,3}),/,
                replace: "onClick:(_vcEv)=>_vcEv.detail>=2&&($1)(),",
            }
        }
    ],

    schedule(cb: () => void, e: any) {
        const id = e.props.channel.id as string;
        // use a different counter for each channel
        const data = (timers[id] ??= { timeout: void 0, i: 0 });
        // clear any existing timer
        clearTimeout(data.timeout);

        // if we already have 2 or more clicks, run the callback immediately
        if (++data.i >= 2) {
            cb();
            delete timers[id];
        } else {
            // else reset the counter in 500ms
            data.timeout = setTimeout(() => {
                delete timers[id];
            }, 500);
        }
    }
});
