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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Tooltip } from "@webpack/common";

import { ActivityIcon, ControllerIcon, HeadsetIcon, PlaystationIcon, RichActivityIcon, XboxIcon } from "./icons";
import { ActivityProps, ActivityType } from "./types";


const regex = /const \w=function\((\w)\)\{var .*?\.activities.*?.applicationStream.*?children:\[.*?null!=.*?\w\.some\(.{3}\)\?(.*?):null/;
const self = "Vencord.Plugins.plugins.Activities";

export default definePlugin({
    name: "Activities",
    description: "TODO!()",
    authors: [Devs.Arjix],

    patches: [
        {
            find: "().textRuler,",
            replacement: {
                match: regex,
                replace: (m, activities, icon) => m.replace(icon, `${self}.ActivitiesComponent({...${activities}})`)
            }
        }
    ],

    ActivitiesComponent(props: ActivityProps) {
        if (!props.activities.length) return null;
        let showRichActivityTooltip = true;

        const icons = props.activities.map(activity => {
            switch (activity.type) {
                case ActivityType.Competing:
                case ActivityType.Playing: {
                    showRichActivityTooltip = false;

                    const isXbox = activity.platform === "xbox";
                    const isPlaystation = ["ps4", "ps5"].includes(activity.platform!);

                    let icon: React.ReactNode = <ControllerIcon width={14} height={14} />;

                    if (isXbox) icon = <XboxIcon width={14} height={14} />;
                    if (isPlaystation) icon = <PlaystationIcon width={14} height={14} />;

                    return (
                        <Tooltip text={`Playing “${activity.name}”`}>{
                            ({ onMouseEnter, onMouseLeave }) => {
                                return <span
                                    onMouseEnter={onMouseEnter}
                                    onMouseLeave={onMouseLeave}
                                >
                                    {icon}
                                </span>;
                            }
                        }</Tooltip>
                    );
                }

                case ActivityType.Listening: {
                    showRichActivityTooltip = false;
                    return <Tooltip text={`Listening to “${activity.details}” by “${activity.state?.replace(/;/g, ",")}”`}>
                        {({ onMouseEnter, onMouseLeave }) => {
                            return <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                                <HeadsetIcon width={14} height={14} />
                            </span>;
                        }}
                    </Tooltip>;
                }
            }
        }).filter(Boolean);

        const richDetails = props.activities.find(activity => (activity.assets || activity.details) && !activity.platform);
        const activityIcon = richDetails ?
            <RichActivityIcon width={16} height={16} />
            : <ActivityIcon width={16} height={16} />;

        icons.splice(0, 0, <Tooltip text={richDetails?.name} shouldShow={!!richDetails?.name?.trim() && showRichActivityTooltip}>
            {({ onMouseEnter, onMouseLeave }) => {
                return <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>{activityIcon}</span>;
            }}
        </Tooltip>);

        return (
            <span style={{ display: "flex", alignItems: "center" }}>
                {icons}
            </span>
        );
    },
});
