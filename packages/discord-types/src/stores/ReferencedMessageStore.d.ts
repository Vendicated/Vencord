import { Message } from "../common";

export interface ReferencedMessageStore {
    getMessageByReference(reference: Message["messageReference"]): { message?: Message; };
}
