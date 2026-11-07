import { FluxStore } from "..";

export interface UserNote {
    loading: boolean;
    note: string | null;
}

export class NoteStore extends FluxStore {
    getNote(userId: string): UserNote | undefined;
}
