/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { ChannelStore, Forms, Menu, React, Switch } from "@webpack/common";
import { ReactElement } from "react";



interface notification {
    slotavailable: boolean;
}


const notificationstore = new Map<String, notification>();
let currenctchannelid = "";


const VoiceStateStore = findStoreLazy("VoiceStateStore");


const ChannelActions = findByPropsLazy("selectVoiceChannel");






function spawnNotification(channelid: string, Title: string, Body?: string) {
    const notification = new Notification(Title, { body: Body });
    notification.onclick = event => {
        ChannelActions.selectVoiceChannel(channelid);
    };

}




const vcContextPatch: NavContextMenuPatchCallback = (children, props) => {
    if (props.channel.bitrate_ === undefined) return;
    // this part only runs when the channel context menu is a voice channel

    children.push(
        <Menu.MenuItem
            id="vc-notifier"
            label="Notifications"
            action={() => {
                currenctchannelid = props.channel.id;
                openModal(modalProps => <Modal modalProps={modalProps} />);
            }}
        />
    );
};

function checkChannel(channelid: string) {
    const usersVoice = VoiceStateStore.getVoiceStatesForChannel(channelid);
    const channel = ChannelStore.getChannel(channelid);
    const maxusers = channel.userLimit;
    var size = Object.keys(usersVoice).length;
    if (size < maxusers) {
        spawnNotification(channelid, "The channel " + channel.name + " is now not full", "Click the notification to join the channel");
        notificationstore.set(channelid, { slotavailable: false });
        bindSlotsNotification(false);
    }

}


const intervals = new Map<String, NodeJS.Timer>();



function bindSlotsNotification(state: boolean) {
    const id = currenctchannelid;
    if (state) {
        intervals.set(currenctchannelid, setInterval(() => checkChannel(id), 5000));
    } else {
        clearInterval(intervals.get(id));
        intervals.delete(id);
    }



}



function Modal({ modalProps }: { modalProps: ModalProps; }) {

    const dataset = notificationstore.get(currenctchannelid);
    const slotavailable = dataset?.slotavailable ?? false;
    let disabled = false;
    let tooltip: ReactElement;
    tooltip = <Forms.FormText>Toggle the notification</Forms.FormText>;
    if (ChannelStore.getChannel(currenctchannelid)?.userLimit === 0) {
        disabled = true;
        tooltip = <Forms.FormText>This channel does not have a limit to how many users can join</Forms.FormText>;
    }
    const [state, setState] = React.useState(slotavailable);
    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle>Notifications</Forms.FormTitle>
            </ModalHeader>

            <ModalContent className={"modal"}>
                <div className={"switches"}>


                    <Switch

                        note={<Forms.FormText>Gives a notification when the channel has atleast one empty slot available</Forms.FormText>}
                        tooltipNote={tooltip}
                        disabled={disabled}
                        value={state}


                        onChange={newstate => {
                            bindSlotsNotification(newstate);
                            notificationstore.set(currenctchannelid, { slotavailable: newstate });
                            setState(newstate);
                        }}>
                        Slot available
                    </Switch>
                </div>




            </ModalContent>


        </ModalRoot>
    );
}









export default definePlugin({
    name: "VCNotifier",
    description: "allows you to bind notification to diffrent vc events \n just right click a voice channel and press the notification button",
    authors: [Devs.Koxek],
    dependencies: ["MessageEventsAPI", "ChatInputButtonAPI"],
    contextMenus: {
        "channel-context": vcContextPatch
    },

});


