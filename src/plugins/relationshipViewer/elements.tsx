import { Margins } from "@utils/margins";
import { Flex } from "@components/Flex";
import { Text, Card, Button } from "@webpack/common";

import { LazyComponent } from "@utils/misc";
import { findByCode } from "@webpack";

import { User } from "discord-types/general";

import "./relationsStyles.css";

// omg spotifyControls my beloved
const Svg = (path: string, label: string) => {
    return () => (
        <svg
            className="relation-avatar"
            height="24"
            width="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-label={label}
            focusable={false}
        >
            <path d={path} />
        </svg>
    );
};

const UserSummaryItem = LazyComponent(() => findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));

const Expand = Svg("M15.88 9.29L12 13.17 8.12 9.29c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59c.39-.39.39-1.02 0-1.41-.39-.38-1.03-.39-1.42 0z", "Expand");

const collapsedElements = {};

const handleContainerButton = (title: string) => {
    const container = document.getElementById(`collapsechildren-${title}`);
    const expansionButton = document.getElementById(`expansionbtn-${title}`);
    if (!(container && expansionButton)) return;

    if (!collapsedElements[title]) {
        collapsedElements[title] = true;

        container.classList.replace("relation-opened", "relation-closed");
        expansionButton.classList.replace("relation-expand-opened", "relation-expand-closed");
    } else {
        collapsedElements[title] = false;

        container.classList.replace("relation-closed", "relation-opened");
        expansionButton.classList.replace("relation-expand-closed", "relation-expand-opened");
    }
};

export const createFormItem = (title: string, text?: string, element?: React.ReactElement) => {
    return (
        <Flex className={`${Margins.left8} ${Margins.top8} ${Margins.right8}`}>
            <Text variant="heading-sm/semibold">{title}</Text>
            {element}
            {text &&
                <Text variant="text-sm/normal">{text}</Text>
            }
        </Flex>
    );
};

export const createFormMember = (user: User, guildId?: string, isMember?: boolean) => {
    return (
        <Flex className={`${isMember && Margins.bottom8} ${isMember && Margins.left8} ${isMember && Margins.top8} ${isMember && Margins.right8} relation-nogap`}>
            <UserSummaryItem className="relation-avatar"
                users={[user]}
                guildId={guildId}
                renderIcon={false}
                showDefaultAvatarsForNullUsers
                showUserPopout
            />
            <Text tag="span" variant={isMember ? "text-md/normal" : "text-sm/normal"}>{user.tag}</Text>
        </Flex>
    );
};

export const createCollapsableForm = (title: string, children: Array<React.ReactElement>, count?: number) => {
    return (
        <Card className={`${Margins.top8} ${Margins.bottom16} ${Margins.left16} ${Margins.right16}`}>
            <div className={`${Margins.top16} ${Margins.bottom16} ${Margins.left8} ${Margins.right8}`}>
                <Flex style={{ justifyContent: "space-between" }}>
                    <Text variant="heading-sm/semibold">{title} {count && `(${count})`}</Text>
                    <Button className="relation-avatar" onClick={() => handleContainerButton(title)}>
                        <div id={`expansionbtn-${title}`} className="relation-expand-opened">
                            <Expand />
                        </div>
                    </Button>
                </Flex>

                <Flex id={`collapsechildren-${title}`} className="relation-form-container relation-opened">
                    {children}
                </Flex>
            </div>
        </Card>
    );
};
