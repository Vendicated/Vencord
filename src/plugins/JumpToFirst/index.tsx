import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { addContextMenuPatch, removeContextMenuPatch, NavContextMenuPatchCallback, findGroupChildrenByChildId } from "@api/ContextMenu";
import { Menu, NavigationRouter } from "@webpack/common";
import { Channel } from "discord-types/general";
export default definePlugin({
    name: "JumpToFirst",
    description: "Adds a context menu option to jump to the first message of a channel",
    authors: 
    [
        Devs.Samwich
    ],
    start()
    {
        addContextMenuPatch("channel-context", Patch);
    },
    stop()
    {
        removeContextMenuPatch("channel-context", Patch);
    }
});


const Patch: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => () => {
    const group = findGroupChildrenByChildId("channel-copy-link", children);
    group?.push(
        <Menu.MenuItem id="jumptofirst" label="Jump To First Message" action={() => jumpToFirstMessage(channel)}></Menu.MenuItem>
    );
};

function jumpToFirstMessage(props)
{
    let guildid = props.guild_id;
    let channelid = props.id;
    let url = `/channels/${guildid}/${channelid}/0`;
    NavigationRouter.transitionTo(url);
}
