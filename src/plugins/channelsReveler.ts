import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";
import { Channel } from "discord-types/general";


// Just remove VIEW_CHANNEL from the permission overrides of the channel
// There are probably better ways to do it but idk




const VIEW_CHANNEL = 1024n;

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
                replace: 'Vencord.Plugins.plugins["Channels Reveler"].replacePermissions(e);D[e.id]=e;'
            }
        },
    ],
    replacePermissions: (t: Channel) => {
        Object.values(t.permissionOverwrites).forEach(e => {
            if (e.deny & VIEW_CHANNEL)
            {
                e.deny -= VIEW_CHANNEL;
            }
        });
    }

});

