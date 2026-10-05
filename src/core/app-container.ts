import { ObjectDisposedError } from "../app-error";
import { cls } from "../app-shell-ui/cls";
import { Action } from "./Action";
import { Disposable } from "./disposable";
import { Settings } from "./settings";
import { Timer, TimerService } from "./timer-service";

const rootClass = cls("app-container");
const canvasClass = cls("scene-canvas");
const mobileCheckInterval = 5;
const mobileResolutionScale = 0.5;
const rootMargin = 16;
const rootMaxWidth = 1000;
const rootMinWidth = 400;

export interface AppContainerSize {
    width: number;
    height: number;
}

export class AppContainer implements Disposable {
    public readonly onResize = new Action();

    private settings: Settings;
    private timerService: TimerService;

    private _root: HTMLDivElement;
    private _canvas: HTMLCanvasElement;
    private mobileCheckTimer: Timer;
    private isMobile: boolean;
    private lastDevicePixelRatio: number;
    private resizeObserver: ResizeObserver;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    get root() {
        return this._root;
    }

    get canvas() {
        return this._canvas;
    }

    get physicalResolution() {
        if (this.disposed) {
            throw new ObjectDisposedError();
        }

        if (this.settings.resolution.aspect === null) {
            return { x: this.settings.resolution.x, y: this.settings.resolution.y };
        } else {
            const height = this._root.clientWidth / this.settings.resolution.aspect;

            const scaleFactor = this.isMobile ? mobileResolutionScale : 1;
            return {
                x: Math.round(this._root.clientWidth * window.devicePixelRatio * scaleFactor),
                y: Math.round(height * window.devicePixelRatio * scaleFactor),
            };
        }
    }

    get aspect() {
        if (this.disposed) {
            throw new ObjectDisposedError();
        }

        const resolution = this.physicalResolution;
        return resolution.x / resolution.y;
    }

    private constructor() {}

    static isMobile() {
        if ("userAgentData" in navigator) {
            return (navigator as Navigator & { userAgentData: { mobile: boolean } }).userAgentData.mobile;
        }

        return /Android|iPhone|iPad|iPod/i.test((navigator as Navigator).userAgent);
    }

    private updateRootAspectRatio = () => {
        const resolution = this.physicalResolution;
        this._root.style.aspectRatio = `${resolution.x} / ${resolution.y}`;
    };

    private init(settings: Settings, timerService: TimerService) {
        this.settings = settings;
        this.timerService = timerService;

        this._root = document.querySelector(rootClass.selector) as HTMLDivElement;
        this.updateRootAspectRatio();
        this._root.addEventListener("dragstart", this.handleDragStart);

        this.lastDevicePixelRatio = window.devicePixelRatio;
        this.updateRootWidth();
        window.addEventListener("resize", this.updateRootWidth);

        this.resizeObserver = new ResizeObserver(this.handleResize);
        this.resizeObserver.observe(this._root);

        this._canvas = this._root.querySelector(canvasClass.selector) as HTMLCanvasElement;

        this.settings.onResolutionChanged.add(this.updateRootAspectRatio);

        this.isMobile = AppContainer.isMobile();
        this.mobileCheckTimer = this.timerService.interval(
            () => (this.isMobile = AppContainer.isMobile()),
            mobileCheckInterval,
            true,
        );

        return this;
    }

    private handleResize = () => {
        this.onResize.invoke();
    };

    private updateRootWidth = () => {
        const devicePixelRatio = window.devicePixelRatio;
        const browserZoomChanged = devicePixelRatio !== this.lastDevicePixelRatio;
        this.lastDevicePixelRatio = devicePixelRatio;

        if (browserZoomChanged) {
            return;
        }

        const availableWidth = document.documentElement.clientWidth - rootMargin;
        const width = Math.max(rootMinWidth, Math.min(rootMaxWidth, availableWidth));

        if (this._root.getBoundingClientRect().width !== width) {
            this._root.style.width = `${width}px`;
        }
    };

    static async create(settings: Settings, timerService: TimerService) {
        const appContainer = new AppContainer();

        if (document.readyState === "loading") {
            const { promise, resolve, reject } = Promise.withResolvers<AppContainer>();

            const callback = () => {
                document.removeEventListener("DOMContentLoaded", callback);
                try {
                    appContainer.init(settings, timerService);
                    resolve(appContainer);
                } catch (error) {
                    reject(error);
                }
            };

            document.addEventListener("DOMContentLoaded", callback);
            return promise;
        }

        return appContainer.init(settings, timerService);
    }

    private handleDragStart = (event: DragEvent) => {
        event.preventDefault();
    };

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this._root?.removeEventListener("dragstart", this.handleDragStart);
        window.removeEventListener("resize", this.updateRootWidth);
        this.resizeObserver?.disconnect();
        this.settings?.onResolutionChanged.remove(this.updateRootAspectRatio);
        this.mobileCheckTimer?.cancel();
        this.onResize.dispose();
    }
}
