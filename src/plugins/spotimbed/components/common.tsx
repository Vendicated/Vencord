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

import { Artist, Resource, User } from "@api/Spotify";
import { intersperse, parseUrl } from "@utils/misc";

import { settings } from "../settings";
import { cl } from "../utils/misc";

type Person = Artist | User;
export function Byline({ people }: { people: Person[]; }) {
    const by = people[0].type === "user"
        ? <ResourceLink resource={people[0]} />
        : <ResourceLinks resources={people} />;
    return <AttributionLine prep="by">{by}</AttributionLine>;
}

export function AttributionLine({ prep, children }: {
    prep: string;
    children: React.ReactNode;
}) {
    return (
        <div className={cl("infoline")}>
            <span>{prep} </span>
            {children}
        </div>
    );
}

export function ResourceLink({ resource, className = "", title }: {
    resource: Resource;
    className?: string;
    title?: string;
}) {
    const { nativeLinks } = settings.use(["nativeLinks"]);
    const name = resource.type === "user" ? resource.display_name : resource.name;
    const url = parseUrl(resource.external_urls.spotify);
    const href = nativeLinks ? `spotify:/${url?.pathname}` : url?.href;

    return <a
        className={[cl("link"), ...className.split(" ")].join(" ")}
        href={href}
        data-resource-link={true}
        target="_blank"
        rel="noreferrer noopener"
        title={title == null ? name : (title || void 0)}
    >{name}</a>;
}

export function ResourceLinks({ resources, className = "" }: {
    resources: Resource[];
    className?: string;
}) {
    const names = resources.map(r => r.name).join(", ");
    const links = resources.map(r => <ResourceLink key={r.id} resource={r} className={className} />);
    return <span title={names}>{intersperse(links, ", ")}</span>;
}
