import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";


export default definePlugin({
    name: "Channel Reaveler",
    description: "Reveal the channel you're not allowed to see.",
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
                // Called on every channel
                match: /D\[e\.id\]\=e\;/g,
                replace: 'Vencord.Plugins.plugins["Channel Reaveler"].replacePermissions(e);D[e.id]=e;'
            }
        },
    ],
    replacePermissions: (t) => {
        Object.values(t.permissionOverwrites).forEach((e) => {
            if (e.deny & 1024n)
                e.deny -= 1024n;
        });
    }

});

