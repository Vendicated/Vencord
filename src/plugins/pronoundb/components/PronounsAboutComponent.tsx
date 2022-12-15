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

import { Link } from "@components/Link";
import { Forms, React } from "@webpack/common";

export default function PronounsAboutComponent() {
    return (
        <React.Fragment>
            <Forms.FormTitle tag="h3">More Information</Forms.FormTitle>
            <Forms.FormText>To add your own pronouns, visit{" "}
                <Link href="https://pronoundb.org">pronoundb.org</Link>
            </Forms.FormText>
            <Forms.FormDivider />
            <Forms.FormText>
                The two pronoun formats are lowercase and capitalized. Example:
                <ul>
                    <li>Lowercase: they/them</li>
                    <li>Capitalized: They/Them</li>
                </ul>
                Text like "Ask me my pronouns" or "Any pronouns" will always be capitalized. <br /><br />
                You can also configure whether or not to display pronouns for the current user (since you probably already know them)
            </Forms.FormText>
        </React.Fragment>
    );
}
