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

import { Track } from "@api/Spotify";
import { Tooltip } from "@webpack/common";

import { useQueue } from "../../hooks/useQueue";
import { cl } from "../../utils/misc";

const QueueIcon = () => <svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 6H4c-.55 0-1 .45-1 1s.45 1 1 1h10c.55 0 1-.45 1-1s-.45-1-1-1zm0 4H4c-.55 0-1 .45-1 1s.45 1 1 1h10c.55 0 1-.45 1-1s-.45-1-1-1zM4 16h6c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zM19 6c-1.1 0-2 .9-2 2v6.18c-.31-.11-.65-.18-1-.18c-1.84 0-3.28 1.64-2.95 3.54c.21 1.21 1.2 2.2 2.41 2.41c1.9.33 3.54-1.11 3.54-2.95V8h2c.55 0 1-.45 1-1s-.45-1-1-1h-2z"></path></svg>;
const QueuedIcon = () => <svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 8q-.425 0-.712-.287Q3 7.425 3 7t.288-.713Q3.575 6 4 6h10q.425 0 .713.287Q15 6.575 15 7t-.287.713Q14.425 8 14 8Zm0 4q-.425 0-.712-.288Q3 11.425 3 11t.288-.713Q3.575 10 4 10h10q.425 0 .713.287q.287.288.287.713t-.287.712Q14.425 12 14 12Zm0 4q-.425 0-.712-.288Q3 15.425 3 15t.288-.713Q3.575 14 4 14h6q.425 0 .713.287q.287.288.287.713t-.287.712Q10.425 16 10 16Zm11.65 2.3l-2.15-2.15q-.275-.275-.275-.7q0-.425.275-.7q.275-.275.688-.275q.412 0 .712.275l1.45 1.4l3.55-3.55q.275-.275.687-.275q.413 0 .713.3t.288.725q-.013.425-.313.725L17.05 18.3q-.275.275-.7.275q-.425 0-.7-.275Z"></path></svg>;
const IssueIcon = () => <svg viewBox="0 0 20 20"><path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M10 0C4.486 0 0 4.486 0 10C0 15.515 4.486 20 10 20C15.514 20 20 15.515 20 10C20 4.486 15.514 0 10 0ZM9 4H11V11H9V4ZM10 15.25C9.31 15.25 8.75 14.691 8.75 14C8.75 13.31 9.31 12.75 10 12.75C10.69 12.75 11.25 13.31 11.25 14C11.25 14.691 10.69 15.25 10 15.25Z"></path></svg>;

export function QueueButton({ track, tooltip }: { track: Track; tooltip?: string; }) {
    const [queued, pending, error, queue] = useQueue(2000);

    const icon = error ? IssueIcon() : queued ? QueuedIcon() : QueueIcon();
    const state = error ? "error" : pending ? "pending" : queued ? "complete" : null;
    const queueButton = (props?: Record<string, any>) => (
        <button
            {...props}
            className={cl("queue-btn")}
            onClick={() => queue(track.id)}
            data-state={state}
        >{icon}</button>
    );

    return tooltip ? <Tooltip text={tooltip}>{queueButton}</Tooltip> : queueButton();
}

