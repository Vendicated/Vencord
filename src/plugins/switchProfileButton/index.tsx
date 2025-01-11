import { migratePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, Icons, TooltipContainer, Text, type MenuTypes } from "@webpack/common";
import { ReactNode } from "react";

const RoleButtonClasses = findByPropsLazy("button", "buttonInner", "icon", "banner");

type SwitchProfileMenuItemProps = {
    id: string;
    label: string;
    subtext: ReactNode;
    action(): void;
};

export default definePlugin({
    name: "SwitchProfileButton",
    description: "Moves the View Main/Server Profile button out of the overflow menu",
    authors: [Devs.Sqaaakoi],

    patches: [
        {
            find: ".FULL_SIZE,user:",
            group: true,
            replacement: [
                {
                    match: /\(\i\.MenuItem(,{id:"view-)/g,
                    replace: "($self.SwitchProfileButton$1"
                },
                {
                    match: /(\(0,\i\.jsx\)\(.{0,30}viewProfileItem:)(\i\(\))}\)/,
                    replace: "$2,$1null})"
                }
            ]
        },
    ],

    SwitchProfileButton: ErrorBoundary.wrap((props: SwitchProfileMenuItemProps) => {
        return <TooltipContainer
            text={<>
                {props.label}
                <Text
                    color="text-muted"
                    variant="text-xs/medium"
                >{props.subtext}</Text>
            </>}
            aria-label={false}
        >
            <Button
                aria-label={props.label}
                onClick={(props.action)}
                look={Button.Looks.FILLED}
                size={Button.Sizes.NONE}
                color={RoleButtonClasses.bannerColor}
                className={classes(RoleButtonClasses.button, RoleButtonClasses.icon, RoleButtonClasses.banner)}
                innerClassName={classes(RoleButtonClasses.buttonInner, RoleButtonClasses.icon, RoleButtonClasses.banner)}
            >
                <Icons.ArrowsLeftRightIcon size="xs" />
            </Button>
        </TooltipContainer>;
    }, { noop: true })
});
