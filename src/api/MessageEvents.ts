type Emoji = {
    require_colons: boolean,
    originalName: string,
    animated: boolean
    guildId: string,
    name: string,
    url: string,
    id: string,
}

type MessageObject = {
    content: string,
    validNonShortcutEmojis: Emoji[]
}

type SendListener = (channelId: string, messageObj: MessageObject, extra: any) => void;
type EditListener = (channelId: string, messageId: string, messageObj: MessageObject) => void;

const sendListeners = new Set<SendListener>();
const editListeners = new Set<EditListener>();

export function _handleSend(channelId: string, messageObj: MessageObject, extra: any) {
    for (const listener of sendListeners) {
        try {
            listener(channelId, messageObj, extra);
        } catch (e) { console.error(`MessageSendHandler: Listener encoutered an unknown error. (${e})`) }
    }
}

export function _handleEdit(channeld: string, messageId: string, messageObj: MessageObject) {
    for (const listener of editListeners) {
        try {
            listener(channeld, messageId, messageObj);
        } catch (e) { console.error(`MessageEditHandler: Listener encoutered an unknown error. (${e})`) }
    }
}

export function addSendListener(listener: SendListener) { sendListeners.add(listener) }
export function addEditListener(listener: EditListener) { editListeners.add(listener) }
export function removeSendListener(listener: SendListener) { sendListeners.delete(listener) }
export function removeEditListener(listener: EditListener) { editListeners.delete(listener) }

// Message clicks
import { Message, Channel } from "./MessageEventTypes"

type ClickListener = (message: Message, channel: Channel, event: MouseEvent) => void;

const listeners = new Set<ClickListener>();

export function _handleClick(message, channel, event) {
    for (const listener of listeners) {
        listener(message, channel, event);
    }
}

export function addClickListener(listener: ClickListener) {
    listeners.add(listener);
}

export function removeClickListener(listener: ClickListener) {
    return listeners.delete(listener);
}