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

import { parseUrl } from "@utils/misc";

import { settings } from "../settings";
import { Artist, Resource, User } from "../types";
import { cl } from "../utils/misc";

type Person = Artist | User;
export function Byline(people: Person[]) {
    const by = people[0].type === "user"
        ? ResourceLink(people[0])
        : ResourceLinks(people);
    return AttributionLine("by", by);
}

export function AttributionLine(prep: string, entity: React.ReactNode) {
    return (
        <div className={cl("infoline")}>
            <span>{prep} </span>
            {entity}
        </div>
    );
}

export function ResourceLink(resource: Resource, className: string = "", title?: string) {
    const { nativeLinks } = settings.use(["nativeLinks"]);
    const name = resource.type === "user" ? resource.display_name : resource.name;
    const url = parseUrl(resource.external_urls.spotify);
    const href = nativeLinks ? `spotify:/${url?.pathname}` : url?.href;

    return <a
        className={[cl("link")].concat(className.split(" ")).join(" ")}
        href={href}
        data-resource-link={true}
        target="_blank"
        rel="noreferrer noopener"
        title={title == null ? name : (title || void 0)}
    >{name}</a>;
}

export function ResourceLinks(resources: Resource[], className: string = "") {
    const names = resources.map(r => r.name).join(", ");
    const links = resources
        .map(r => ResourceLink(r, className))
        .reduce((prev, curr) => <>{prev}, {curr}</>);
    return <span title={names}>{links}</span>;
}
