import { definePlugin } from "@api/Plugin";
import { findByProps } from "@webpack";
import { getCurrentUser } from "@webpack/common";

// This finds the Popout component Discord uses for profiles
const UserPopout: any = findByProps("UserPopout", "default");

export default definePlugin({
    name: "NitiCustoms",
    description: "Adds a mini-profile popout to the User Settings icon for quick access. ^^",
    authors: [
        {
            name: "niti7",
            id: 344154934029058050n,
        }
    ],

    patches: [
        {
            // Changes the "Home" button tooltip
            find: 'target:"home"', 
            replacement: {
                match: /tooltipText:\w+\.Messages\.DIRECT_MESSAGES/,
                replace: 'tooltipText:"Niti\'s Den :3"' 
            }
        },
        {
            // Adds the profile popout to the Settings gear
            find: 'target:"user-settings"',
            replacement: {
                match: /(return\s+)(\w+\.jsx\)\("div",\{[^}]+target:"user-settings"[^}]+}\))/ ,
                replace: `$1 <${UserPopout} renderPopout={() => <${UserPopout} userId="${getCurrentUser()?.id}" />}> {(props: any) => $2} </${UserPopout}>`
            }
        }
    ]
});
