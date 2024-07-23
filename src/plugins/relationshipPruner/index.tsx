import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { openModal } from "@utils/modal";
import { classNameFactory, disableStyle, enableStyle } from "@api/Styles";
import { findByPropsLazy } from "@webpack";
import style from "./style.css?managed";

import { GuildPruneModal } from "./components/GuildPruneModal";
import { FriendPruneModal } from "./components/FriendPruneModal";


export const cl = classNameFactory("vc-relationshipPruner-")

export default definePlugin({
    name: "RelationshipPruner",
    description: "Adds a way to easily prune your servers and friends. To open, right click the home button or friends tab button",
    authors:
    [
        Devs.Samwich
    ],
    onContextMenu(type)
    {
        openModal(props => (type == "guild" ? <GuildPruneModal {...props}/> : <FriendPruneModal {...props}/>));
    },
    patches: [
        {
            find: ".DISCODO_DISABLED",
            replacement: {
                match: /.NavItem,{/,
                replace: "$&onContextMenu:() => $self.onContextMenu(\"guild\"),"
            }
        },
        {
            find: "friends_tab_no_track",
            replacement: 
            {
                match: /text:\i.\i.Messages.FRIENDS,onClick:/,
                replace: "onContextMenu:() => $self.onContextMenu(\"friend\"), $&"
            }
        }
    ],
    start()
    {
        enableStyle(style);
    },
    stop()
    {
        disableStyle(style);
    }
});
