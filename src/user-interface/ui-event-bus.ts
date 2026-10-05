import { Action } from "../core/Action";
import { Key } from "../localization/localization";

export interface UIEventBus {
    requestHint: (hintKey: Key) => void;
}

export class UIEventBusHandler implements UIEventBus{
    readonly onRequestHint = new Action<[hintKey: Key]>();

    requestHint(hintKey: Key) {
        this.onRequestHint.invoke(hintKey);
    }
}
