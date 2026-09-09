import { FluxStore, Message } from "..";

export interface ReferencedMessageStore extends FluxStore {
    getMessageByReference(reference: Message["messageReference"]): { message?: Message; };
}
