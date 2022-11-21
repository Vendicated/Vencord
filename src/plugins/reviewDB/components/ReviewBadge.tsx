import { IpcEvents } from "../../../utils";
import { Tooltip } from "../../../webpack/common";

import Badge from "../entities/Badge";

export default function ReviewBadge(badge: Badge) {
    return (
        <Tooltip
            text={badge.badge_name}>
            {({ onMouseEnter, onMouseLeave }) => (
                <img
                    width="22px"
                    height="22px"
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    src={badge.badge_icon}
                    style={{ verticalAlign: "middle", marginLeft: "4px" }}
                    onClick={() =>
                        VencordNative.ipc.invoke(IpcEvents.OPEN_EXTERNAL, badge.redirect_url)
                    }
                />
            )}
        </Tooltip>
    );
}
