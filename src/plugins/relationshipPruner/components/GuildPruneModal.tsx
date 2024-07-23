import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, GuildMemberStore, GuildStore, PermissionsBits, PermissionStore, RelationshipStore, RestAPI, SnowflakeUtils, Text, UserStore, useState } from "@webpack/common";
import { useEffect } from "@webpack/common";
import { useAwaiter } from "@utils/react";
import { GuildMemberCountStore } from "plugins/memberCount";
import { cl } from "../index";
import { InfoWithIcon } from "./InfoWithIcon"
import { findByPropsLazy } from "@webpack";
import constants from "../constants";

const { leaveGuild } = findByPropsLazy("deleteGuild", "leaveGuild");

function ServerInfoComponent(props)
{
    const { server, messages, recentMessages } = props;
    const serverIcon = server?.getIconSource("256", true)?.uri;

    return (
        <div className={cl("modalparent")}>
            <img src={serverIcon}></img>
            <div className={cl("info")}>
                <InfoWithIcon svg={constants.book}>{server.name}</InfoWithIcon>
                <InfoWithIcon svg={constants.clock}>{messages} messages from you</InfoWithIcon>
                <InfoWithIcon svg={constants.pastClock}>{recentMessages} messages from you in the past week</InfoWithIcon>
                <InfoWithIcon svg={constants.heart}>You have {RelationshipStore.getFriendIDs().filter(e => GuildMemberStore.isMember(server.id, e)).length} friends in the server</InfoWithIcon>
                <InfoWithIcon svg={constants.globe}>{GuildMemberCountStore.getMemberCount(server.id)} total members</InfoWithIcon>
                {PermissionStore.can(PermissionsBits.ADMINISTRATOR, server) && <InfoWithIcon svg={constants.crown}>You are an administrator in this server</InfoWithIcon>}
            </div>
        </div>
    )
}

export function GuildPruneModal(props)
{   

    const joinedServers = Object.values(GuildStore.getGuilds()).filter(e => !e.isOwner(UserStore.getCurrentUser()));

    let [index, setIndex] = useState(0);

    let [messages, setMessages] = useState("");
    let [recentMessages, setRecentMessages] = useState("");

    let [waited, setWaited] = useState(false);
    function ProcessNext(shouldLeave)
    {
        if(shouldLeave)
        {
            leaveGuild(joinedServers[index].id);
        }
        if(joinedServers[index + 1])
        {
            setIndex(index + 1);
            setMessages("??");
            setRecentMessages("??");
            setWaited(false);
        }
        else
        {
            props.onClose();
        }
    }

    useEffect(() => 
    {
        const timer = setTimeout(() => 
        {
          setWaited(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, [index]); 

      
    useAwaiter(async () => 
    {
        let response = await RestAPI.get(
        {
            url: `/guilds/${joinedServers[index].id}/messages/search?author_id=${UserStore.getCurrentUser().id}`
        });
        let recentResponse = await RestAPI.get(
        {
            url: `/guilds/${joinedServers[index].id}/messages/search?author_id=${UserStore.getCurrentUser().id}&min_id=${SnowflakeUtils.fromTimestamp(Date.now() - (7 * 24 * 60 * 60 * 1000))}`
        });
        setMessages(response.body.total_results.toString());
        setRecentMessages(recentResponse.body.total_results.toString());
    },
    {
        deps: [index],
        fallbackValue: null
    })

    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false}>
                <Text color="header-primary" variant="heading-lg/semibold" tag="h1" style={{ flexGrow: 1 }}>
                    Server Prune ({index + 1}/{joinedServers.length})
                </Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent scrollbarType="none">
                <ServerInfoComponent server={joinedServers[index]} messages={messages} recentMessages={recentMessages}/>
                <div className={cl("buttongroup")}>
                    <Button onClick={() => ProcessNext(false)} disabled={!waited} color={Button.Colors.GREEN}>Keep</Button>
                    <Button onClick={() => ProcessNext(true)} disabled={!waited} color={Button.Colors.RED}>Leave</Button>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}