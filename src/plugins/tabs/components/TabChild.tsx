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

import { DataStore } from "@api/index";
import { NavigationRouter } from "@webpack/common";

import { Tab } from "../types";
import { tabs, tabsKey, updateTabs } from "../utils";

export default function TabChild({ tab }: { tab: Tab; }) {
    const linkBase = "/channels/";
    const link = linkBase +
        (tab.guildId ? `${tab.guildId}/${tab.channelId}` : `@me/${tab.channelId}`);

    function handleNavigation() {
        window.focus();
        NavigationRouter.transitionTo(link);
    }

    function handleAuxClick(e) {
        // Middle mouse click
        if (e.nativeEvent.button === 1) return handleDelete();
    }

    async function handleDelete() {
        tabs.delete(tab.channelId);
        // Persist data
        await DataStore.set(tabsKey(), tabs);
        updateTabs();
    }

    console.log(tab);
    return <li onAuxClick={handleAuxClick} className={"tab-link channel-1Shao0 container-32HW5s"} role="listitem" aria-setsize={157}>
        <div className="interactive-26HRN_ interactive-iyXY_x">
            <a onClick={handleNavigation} className="link-39sEB3" aria-label={`${tab.name} | ${tab.description} (tab)`} data-list-item-id="private-channels-uid_22___372858082730049536">
                <div className="layout-1LjVue">
                    <div className="content-66wMin">
                        <div className="nameAndDecorators-2A8Bbk">
                            <div className="tabs-title name-2m3Cms">
                                {tab.notificationCount > 0 &&
                                    <div className="tabs-badge-inner numberBadge-37OJ3S base-3IDx3L eyebrow-132Xza baseShapeRound-3epLEv" >
                                        {tab.notificationCount}
                                    </div>
                                }
                                <div className="overflow-1wOqNV">
                                    {tab.displayName}
                                </div>
                            </div>
                        </div>
                        <div className="subText-3Sk0zy">
                            <div className="activity-1-H7Zd subtext-14b69p">
                                <div className="activityText-ev7Z1T">
                                    {tab.description}
                                </div>
                                <div className="textRuler-1DsANg activityText-ev7Z1T" aria-hidden="true">
                                    {tab.description}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
            <div onClick={handleDelete} className="closeButton-mupH76" aria-label="Close Tab" role="button">
                <svg aria-hidden="false" role="img" className="closeIcon-1NwtbI" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z">
                    </path>
                </svg>
            </div>
        </div>
    </li>;
}
