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

import { Link } from "@components/Link";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, showToast } from "@webpack/common";

interface Props extends React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
    target: string;
    disabled?: boolean;
}

const InviteActions = findByPropsLazy("resolveInvite");

export function InviteLink(props: React.PropsWithChildren<Props>) {
    if (props.disabled) {
        props.style ??= {};
        props.style.pointerEvents = "none";
        props["aria-disabled"] = true;
    }
    return (
        <Link
            href={`https://discord.gg/${props.target}`}
            onClick={async e => {
                e.preventDefault();
                const { invite } = await InviteActions.resolveInvite(props.target, "Desktop Modal");
                if (!invite) return showToast("Invalid or expired invite");

                FluxDispatcher.dispatch({
                    type: "INVITE_MODAL_OPEN",
                    invite,
                    code: props.target,
                    context: "APP"
                });
            }}
        >
            {props.children}
        </Link>
    );
}
