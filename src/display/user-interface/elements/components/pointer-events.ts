import { AppError } from '../../../../app-error';
import { Action } from "../../../../core/Action";
import { Disposable } from "../../../../core/disposable";
import { VisualElement } from "../visual-element";

export type EventType =
    | "onclick"
    | "onpointerenter"
    | "onpointerleave"
    | "onpointerdown"
    | "onpointerup"
    | "onpointercancel";

type RemoveCallback = () => void;
type TargetElement = VisualElement | null;

export interface PointerEvents extends Disposable {
    interactive: boolean;
    addEventListener(eventType: EventType, callback: (target?: TargetElement) => void): RemoveCallback;
    removeEventListener(eventType: EventType, callback: (...args: any[]) => void): void;
}

export interface PointerEventsInternal extends PointerEvents {
    readonly events: Map<EventType, Action>;
    invoke(eventType: EventType, ...args: any[]): void;
}

export class PointerEventsImpl implements PointerEventsInternal {
    public readonly events: Map<EventType, Action> = new Map([
        ["onclick", new Action<[target: TargetElement]>()],
        ["onpointerdown", new Action<[target: TargetElement]>()],
        ["onpointerenter", new Action()],
        ["onpointerleave", new Action()],
        ["onpointerup", new Action<[target: TargetElement]>()],
        ["onpointercancel", new Action()],
    ]);

    private _interactive = false;
    private _interactiveChangeLocked = false;
    private _disposed = false;

    get interactive() {
        return this._interactive;
    }

    set interactive(value) {
        if (this._interactiveChangeLocked) {
            console.warn("Cannot change 'interactive' state in event callback.");
            return;
        }

        if (this._interactive === value) {
            return;
        }

        this._interactive = value;
        if (this._interactive) {
            return;
        }

        // Switching to false
        this._interactiveChangeLocked = true;
        this.invoke("onpointerleave");
        this.invoke("onpointercancel");
        this._interactiveChangeLocked = false;
    }

    get disposed() {
        return this._disposed;
    }

    constructor(interactive = false) {
        this.interactive = interactive;
    }

    addEventListener(eventType: EventType, callback: (target?: TargetElement) => void): RemoveCallback {
        if (this.disposed) {
            throw new AppError("Object was disposed. Create new one.");
        }

        const action = this.events.get(eventType);
        if (action) {
            return action.add(callback);
        }

        throw new AppError(`No action bound to event type ${eventType}. Is it correct event type name?`);
    }

    removeEventListener(eventType: EventType, callback: (...args: any[]) => void): void {
        if (this.disposed) {
            return;
        }

        const action = this.events.get(eventType);
        if (action) {
            return action.remove(callback);
        }
    }

    invoke(eventType: EventType, ...args: any[]): void {
        if (this.disposed) {
            return;
        }

        const action = this.events.get(eventType);
        if (action) {
            return action.invoke(...args);
        }
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        for (const action of [...this.events.values()]) {
            action.dispose();
        }

        this.events.clear();

        this._disposed = true;
    }
}

export function createPointerEvents(): PointerEvents {
    return new PointerEventsImpl();
}
