import { IGlobalKeyDownMap } from "./IGlobalKeyDownMap";
import { IGlobalKeyEvent } from "./IGlobalKeyEvent";
import { IGlobalKeyResult } from "./IGlobalKeyResult";
/**
 * The signature of a global key listener
 */
export declare type IGlobalKeyListener = {
    /**
     * Listens for key events
     * @param event The key event that was emitted
     * @param isDown The other keys that are registered to have been held while the event fired (Note this can become desynchronized if another program with higher priority captures and halts an event)
     * @returns Weather the event should be captured
     */
    (event: IGlobalKeyEvent, isDown: IGlobalKeyDownMap): IGlobalKeyResult;
};
//# sourceMappingURL=IGlobalKeyListener.d.ts.map