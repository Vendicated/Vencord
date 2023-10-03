import { LazyComponent } from "@utils/react";
import { findByPropsLazy, find } from "@webpack";
import { classFactory } from "..";

const InputTypes = findByPropsLazy("VOICE_CHANNEL_STATUS", "SIDEBAR");
const InputComponent = LazyComponent(() => find(m => m?.type?.render?.toString().includes("CHANNEL_TEXT_AREA).AnalyticsLocationProvider")));

interface EmojiSelectorProps {
    onChange(v: string): void;
}

export function EmojiSelector(props: EmojiSelectorProps) {
    return (
        <InputComponent
            className={classFactory("emoji-picker")}
            style={{ margin: "10px" }}
            type={InputTypes.FORM}
            channel={{
                flags_: 256,
                guild_id_: null,
                id: "0",
                getGuildId: () => null,
                isPrivate: () => true,
                isActiveThread: () => false,
                isArchivedLockedThread: () => false,
                isDM: () => true,
                roles: { "0": { permissions: 0n } },
                getRecipientId: () => "0",
                hasFlag: () => false,
            }}
            textValue=""
            placeholder="Emoji"
            onChange={props.onChange}
        />
    );
}