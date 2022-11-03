/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Queue } from "../../../utils/Queue";
import { findByProps } from "../../../webpack";
import { Alerts, React, UserStore,UserUtils } from "../../../webpack/common";
import { deleteReview, reportReview } from "../Utils/ReviewDBAPI";
import { openUserProfileModal, showToast } from "../Utils/Utils";
import MessageButton from "./MessageButton";

const { cozyMessage, buttons } = findByProps("cozyMessage");
const { container, isHeader } = findByProps("container", "isHeader");
const { avatar, clickable } = findByProps("avatar", "zalgo");
const { username } = findByProps("header", "zalgo");
const { messageContent } = findByProps("messageContent", "zalgo");
const { message } = findByProps("message");
const { groupStart } = findByProps("groupStart");
const { wrapper } = findByProps("wrapper", "zalgo");
const { cozy } = findByProps("cozy", "zalgo");
const { contents } = findByProps("contents");
const { getUserAvatarURL } = findByProps("getUserAvatarURL");
const getUser = UserUtils.fetchUser;
const buttonClassNames = findByProps("button", "wrapper", "disabled");
const usernameClickable = findByProps("clickable", "username").clickable;
const { defaultColor } = findByProps("defaultColor");
const { useEffect } = React;

const queue = new Queue();


export default function ReviewComponent(props) {
    const { review } = props;

    function openModal() {
        openUserProfileModal(props.review.senderdiscordid);
    }

    function delReview() {
        Alerts.show({
            title: "ARE YOU SURE ABOUT THAT",
            body: "DELETE THAT REVIEWW????",
            confirmText: "Yop",
            cancelText: "Explod",
            onConfirm: () => {
                deleteReview(props.review.id).then(res => {
                    if (res.successful) {
                        props.fetchReviews();
                    }
                    showToast(res.message);
                });
            }
        });
    }

    function reportRev() {
        Alerts.show({
            title: "ARE YOU SURE ABOUT THAT",
            body: "REPORT THAT REVIEWW????",
            confirmText: "Yop",
            cancelText: "Explod",
            onConfirm: () => {
                reportReview(review.id);
            }
        });
    }

    return (
        <div>
            <div className={cozyMessage + " " + message + " " + groupStart + " " + wrapper + " " + cozy}>
                <div className={contents}>
                    <img className={avatar + " " + clickable} onClick={() => { openModal(); }}
                        src={review.profile_photo === "" ? "/assets/1f0bfc0865d324c2587920a7d80c609b.png?size=128" : review.profile_photo}></img>
                    <span className={username + " " + usernameClickable}
                        style={{ color: "var(--text-muted)" }} onClick={() => openModal()}>{review.username}</span>
                    <p className={messageContent + " " + defaultColor} style={{ fontSize: 15, marginTop: 4 }}>{review.comment}</p>
                    <div className={container + " " + isHeader + " " + buttons}>
                        <div className={buttonClassNames.wrapper}>
                            <MessageButton type="report" callback={() => reportRev()}></MessageButton>
                            {(review.senderdiscordid === UserStore.getCurrentUser().id) && (<MessageButton type="delete" callback={() => delReview()}></MessageButton>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

}
