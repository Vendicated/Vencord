import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { User } from "discord-types/general";
import { findStoreLazy } from "@webpack";
import { NavContextMenuPatchCallback, navPatches } from "@api/ContextMenu";
import { ChannelStore, React, Forms, Menu, Switch } from "@webpack/common";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import "./styles.css";
import { Channel } from "discord-types/general";
import { definePluginSettings } from "@api/Settings";





const vcmenu = "gdm-context";
const VoiceStateStore = findStoreLazy("VoiceStateStore");

const store = findStoreLazy("VoiceStateStore");
const ChannelActions = findByPropsLazy("selectVoiceChannel");
function init() {
    const channelid = "1232073542942851107";
    const channelobj = ChannelStore.getChannel(channelid);
    console.log();


};





    function spawnNotification() {
        const notification = new Notification("join vc");
        const channelId= "1232073542942851107";
        console.log(channelId);
        notification.onclick = (event) => {
            ChannelActions.selectVoiceChannel(channelId);
        };

    };

interface UserProps {
    user: User;
}



const vcContextPatch: NavContextMenuPatchCallback = (children, props) => {
    if (props.channel.bitrate_ === undefined) return;
    //this part only runs when the channel context menu is a voice channel

    children.push(
        <Menu.MenuItem
            id="vc-notifier"
            label="Notifications"
            action={ () => {
                console.log("clicked")
                openModal(modalProps => <Modal modalProps={modalProps}/>);
            }}
        />
    )
};







function Modal({ modalProps }: { modalProps: ModalProps; }) {
    const [state, setState] = React.useState(false);

    let cv = false;
  return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle>Notifications</Forms.FormTitle>
            </ModalHeader>

            <ModalContent className={"modal"}>
                <div className={"switches"}>


                    <Switch

                        note={<Forms.FormText>Gives a notification when the channel has atleast one empty slot available</Forms.FormText>}


                        value={state}


                        onChange={(newstate) => {
                            console.log("test");

                            setState(newstate);
                        }}>
                        Slot available
                    </Switch>
                </div>




            </ModalContent>


        </ModalRoot>
    );
}



const settings = definePluginSettings({
    oneTimeNotifications: {
        type: OptionType.BOOLEAN,
        description: "Make the notification work only once after the first trigger it will be disabled and will have to be manually re-enabled",
        default: true,
    },
});





export default definePlugin({
    name: "VCNotifier",
    description: "allows you to bind notification to diffrent vc events",
    authors: [Devs.Koxek],
    dependencies: ["MessageEventsAPI", "ChatInputButtonAPI"],
    settings,
    contextMenus: {
        "channel-context": vcContextPatch
    },


    start: () => init(),
    stop: () => removeChatBarButton("NotificationTest")
});


