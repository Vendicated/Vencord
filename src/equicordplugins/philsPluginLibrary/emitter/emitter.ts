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

import EventEmitter from "events";
import TypedEmitter from "typed-emitter";

export type TypedEmitterEvents<J extends TypedEmitter<any>> = J extends TypedEmitter<
    infer N
>
    ? N
    : never;

export interface EmitterEvent {
    emitter: TypedEmitter<any> | EventEmitter;
    event: any;
    fn: (...args: any[]) => any;
    plugin?: string;
}

export class Emitter {
    private static events: EmitterEvent[] = [];

    public static addListener<
        T extends TypedEmitter<any>,
        U extends keyof TypedEmitterEvents<T>,
        V extends TypedEmitterEvents<T>[U]
    >(
        emitter: T,
        type: keyof Pick<EventEmitter, "on" | "once">,
        event: U,
        fn: V,
        plugin?: string
    ): () => void;

    public static addListener(
        emitter: EventEmitter,
        type: keyof Pick<EventEmitter, "on" | "once">,
        event: string,
        fn: (...args: any[]) => void,
        plugin?: string
    ): () => void {
        emitter[type](event, fn);
        const emitterEvenet: EmitterEvent = {
            emitter,
            event,
            fn,
            plugin: plugin
        };
        this.events.push(emitterEvenet);

        return () => this.removeListener(emitterEvenet);
    }

    public static removeListener(emitterEvent: EmitterEvent) {
        emitterEvent.emitter.removeListener(emitterEvent.event, emitterEvent.fn);
        this.events = this.events.filter(
            emitterEvent_ => emitterEvent_ !== emitterEvent
        );
    }

    public static removeAllListeners(plugin?: string) {
        if (!plugin) {
            this.events.forEach(emitterEvent =>
                this.removeListener(emitterEvent)
            );
        } else
            this.events.forEach(emitterEvent =>
                plugin === emitterEvent.plugin && this.removeListener(emitterEvent)
            );
    }
}
