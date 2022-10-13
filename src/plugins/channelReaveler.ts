import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";


// Just remove VIEW_CHANNEL from the permission overrides of the channel
// There are probably better ways to do it but idk

const VIEW_CHANNEL = 1024n

export default definePlugin({
    name: "Channel Reaveler",
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
                replace: 'Vencord.Plugins.plugins["Channel Reaveler"].replacePermissions(e);D[e.id]=e;'
            }
        },
    ],
    replacePermissions: (t) => {
        // TODO: Get member and individually check if permission override applies to me.
        // (And add something like a lock icon to the name or something cause right now you can't differentiate)
        Object.values(t.permissionOverwrites).forEach((e) => {
            if (e.deny & VIEW_CHANNEL)
            {
                e.deny -= VIEW_CHANNEL;
            }
        });
    }

});

