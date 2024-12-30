/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { openUserProfile } from "@utils/discord";
import { UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

export default ({ message }: { message: Message; }) => {
    if (!message.content.match(/https:\/\/discord\.com\/users\/\d+/)) return null;
    const userID = message.content.match(/https:\/\/discord\.com\/users\/(\d+)/)?.[1];
    if (!userID) return null;
    const user = UserStore.getUser(userID);
    if (!user) return null;

    return (
        <UserComponent
            avatar={user.getAvatarURL(undefined, undefined, true)}
            name={(user as any).globalName}
            activityText={`@${user.username} (${user.id})`}
            onClick={() => openUserProfile(userID)}
        />
    );
};

const UserComponent = ({ avatar, name, activityText, onClick }) => {
    const avatarStyle = {
        borderRadius: "50%",
    };

    return (
        <div
            className="itemCard-3Etziu wrapper-2RrXDg outer-2JOHae padded-2NSY6O active-1W_Gl9 interactive-2zD88a"
            tabIndex={0}
            aria-expanded="true"
            aria-haspopup="menu"
            role="button"
            aria-controls="popout_197"
            onClick={onClick}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
        >
            <div>
                <header className="headerFull-34WFWN header-3jUeHi">
                    <div
                        className="wrapper-3Un6-K headerAvatar-GgCKcl"
                        role="img"
                        aria-label={`${name}, Idle`}
                        aria-hidden="false"
                        style={{ width: "32px", height: "32px" }}
                    >
                        <svg width="40" height="40" viewBox="0 0 40 40" className="mask-1y0tyc svg-1G_H_8" aria-hidden="true">
                            <foreignObject x="0" y="0" width="32" height="32">
                                <div className="avatarStack-3Bjmsl">
                                    <img src={avatar} alt=" " className="avatar-31d8He" style={avatarStyle} aria-hidden="true" />
                                </div>
                            </foreignObject>
                        </svg>
                    </div>
                    <div>
                        <div className="defaultColor-1EVLSt text-md-semibold-2VMhBr textContent-TsKzji" data-text-variant="text-md/semibold">
                            {name}
                        </div>
                        <div className="text-sm-normal-AEQz4v textContent-TsKzji" data-text-variant="text-sm/normal" style={{ color: "var(--header-secondary)" }}>
                            <span>{activityText}</span>
                        </div>
                    </div>
                </header>
            </div>
        </div>
    );
};


