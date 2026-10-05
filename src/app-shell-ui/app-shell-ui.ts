import { ObjectDisposedError } from "../app-error";
import { Component, createComponent } from "../core/ComponentRegistry";
import { Disposable } from "../core/disposable";
import { Settings } from "../core/settings";
import { Localization } from "../localization/localization";
import { BlackPanel } from "./black-panel";
import { cls } from "./cls";
import { ContinuePanel } from "./continue-panel";
import { LoadingPanel } from "./loading-panel";

const rootClass = cls("app-shell-ui-container");
const fpsCounterClass = cls("fps-counter");
const hiddenClass = cls("hidden");

export interface AppShellUIPanel extends Component {
    show: (animated?: boolean) => Promise<void> | void;
    hide: (animated?: boolean) => Promise<void> | void;
}

export type AppShellUIPanelConstructor<T extends AppShellUIPanel> = new (...args: any[]) => T;

interface AppShellUIContext {
    settings: Settings;
    localization: Localization;
}

export class AppShellUI implements Disposable {
    private ctx: AppShellUIContext;

    private root: HTMLDivElement;
    private fpsCounter: HTMLParagraphElement;

    private panels: AppShellUIPanel[] = [];
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    private constructor() {}

    private init(settings: Settings, localization: Localization) {
        this.ctx = { settings, localization };

        this.root = document.querySelector(rootClass.selector) as HTMLDivElement;
        this.fpsCounter = this.root.querySelector(fpsCounterClass.selector) as HTMLParagraphElement;

        this.panels.push(createComponent(BlackPanel));
        this.panels.push(createComponent(LoadingPanel, this.ctx));
        this.panels.push(createComponent(ContinuePanel, this.ctx));

        this.updateFpsLabelVisibility();
        this.ctx.settings.onShowFpsChanged.add(this.updateFpsLabelVisibility);

        return this;
    }

    private updateFpsLabelVisibility = () => {
        if (this.ctx.settings.showFps) {
            this.fpsCounter.classList.remove(hiddenClass.name);
        } else {
            this.fpsCounter.classList.add(hiddenClass.name);
        }
    };

    static create(settings: Settings, localization: Localization) {
        return new AppShellUI().init(settings, localization);
    }

    get blockInput() {
        this.throwIfDisposed();
        return this.root.style.pointerEvents === "all";
    }

    set blockInput(value: boolean) {
        this.throwIfDisposed();
        this.root.style.pointerEvents = value ? "all" : "none";
    }

    set fpsLabel(text: string) {
        this.throwIfDisposed();
        this.fpsCounter.innerText = text;
    }

    getPanelByType<T extends AppShellUIPanel>(panelType: AppShellUIPanelConstructor<T>) {
        return this.panels.find((panel) => panel instanceof panelType) as T;
    }

    private throwIfDisposed() {
        if (this.disposed) {
            throw new ObjectDisposedError();
        }
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        for (const panel of this.panels) {
            panel?.dispose?.();
        }

        this.panels.length = 0;
        this.ctx.settings?.onShowFpsChanged.remove(this.updateFpsLabelVisibility);
    }
}
