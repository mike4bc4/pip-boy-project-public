import { ObjectDisposedError } from "../app-error";
import { Locale } from "../localization/localization";
import { Action } from "./Action";
import { AppContainer } from "./app-container";
import { Disposable } from "./disposable";

const storageKey = "pip-boy-app:settings";

export interface Resolution {
    x: number;
    y: number;
    aspect: number | null;
}

class Entries {
    public locale = Locale.EN;
    public volume = 0.5;
    public showHints = true;
    public showFps = true;
    public resolution: Resolution = { x: 0, y: 0, aspect: 16 / 9 };
    public maxFps = 60;
}

interface Save {
    locale?: Locale;
    volume?: number;
    showHints?: boolean;
    showFps?: boolean;
    resolution?: Resolution;
    maxFps?: number;
}

const defaultSettingsDesktop = new Entries();
const defaultSettingsMobile: Entries = { ...new Entries(), ...{ maxFps: 30 } };

export class Settings implements Disposable {
    public readonly onLocaleChanged = new Action<[previousLocale?: Locale]>();
    public readonly onVolumeChanged = new Action();
    public readonly onShowHintsChanged = new Action();
    public readonly onShowFpsChanged = new Action();
    public readonly onResolutionChanged = new Action();
    public readonly onMaxFpsChanged = new Action();

    private entries = {} as Entries;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    private constructor() {}

    get locale() {
        return this.entries.locale;
    }

    set locale(value: Locale) {
        this.throwIfDisposed();

        if (value === this.entries.locale) {
            return;
        }

        const previousLocale = this.entries.locale;
        this.entries.locale = value;
        this.onLocaleChanged.invoke(previousLocale);
    }

    get volume() {
        return this.entries.volume;
    }

    set volume(value: number) {
        this.throwIfDisposed();

        if (value === this.entries.volume) {
            return;
        }

        this.entries.volume = this.getSafeVolume(value);
        this.onVolumeChanged.invoke();
    }

    get showHints() {
        return this.entries.showHints;
    }

    set showHints(value: boolean) {
        this.throwIfDisposed();

        if (value === this.entries.showHints) {
            return;
        }

        this.entries.showHints = value;
        this.onShowHintsChanged.invoke();
    }

    get showFps() {
        return this.entries.showFps;
    }

    set showFps(value: boolean) {
        this.throwIfDisposed();

        if (value === this.entries.showFps) {
            return;
        }

        this.entries.showFps = value;
        this.onShowFpsChanged.invoke();
    }

    get resolution(): Resolution {
        return this.entries.resolution;
    }

    set resolution(value: { x: number; y: number } | { aspect: number }) {
        this.throwIfDisposed();

        if (Object.hasOwn(value, "aspect")) {
            value = value as { aspect: number };
            if ((value as { aspect: number }).aspect === this.entries.resolution.aspect) {
                return;
            }

            this.entries.resolution.x = 0;
            this.entries.resolution.y = 0;
            this.entries.resolution.aspect = value.aspect;
            this.onResolutionChanged.invoke();
        } else {
            value = value as { x: number; y: number };
            if (value.x === this.entries.resolution.x && value.y === this.entries.resolution.y) {
                return;
            }

            this.entries.resolution.x = value.x;
            this.entries.resolution.y = value.y;
            this.entries.resolution.aspect = null;
            this.onResolutionChanged.invoke();
        }
    }

    get maxFps() {
        return this.entries.maxFps;
    }

    set maxFps(value: number) {
        this.throwIfDisposed();

        if (value === this.entries.maxFps) {
            return;
        }

        this.entries.maxFps = this.getSafeMaxFps(value);
        this.onMaxFpsChanged.invoke();
    }

    private getSafeVolume(volume: number) {
        return Math.max(0, Math.min(1, volume));
    }

    private getSafeMaxFps(fps: number) {
        return Math.max(0, Math.min(1000, fps));
    }

    static create() {
        const settings = new Settings();
        const success = settings.load();

        const defaultSettings = AppContainer.isMobile() ? defaultSettingsMobile : defaultSettingsDesktop;

        if (!success) {
            Object.assign(settings.entries, defaultSettings);
        }

        return settings;
    }

    setDefault(invokeEvents = true) {
        this.throwIfDisposed();

        const defaultSettings = AppContainer.isMobile() ? defaultSettingsMobile : defaultSettingsDesktop;

        if (invokeEvents) {
            this.locale = defaultSettings.locale;
            this.volume = defaultSettings.volume;
            this.showHints = defaultSettings.showHints;
            this.showFps = defaultSettings.showFps;
            this.resolution = defaultSettings.resolution;
            this.maxFps = defaultSettings.maxFps;
        } else {
            Object.assign(this.entries, defaultSettings);
        }
    }

    load() {
        this.throwIfDisposed();

        try {
            const saved = localStorage.getItem(storageKey);

            if (!saved) {
                return false;
            }

            const defaultSettings = AppContainer.isMobile() ? defaultSettingsMobile : defaultSettingsDesktop;

            const save = JSON.parse(saved) as Save;
            this.entries = { ...defaultSettings, ...save };

            const resolution = { ...defaultSettings.resolution, ...save.resolution };
            this.entries.resolution = resolution;

            return true;
        } catch {
            console.warn("Could not read settings from local storage.");
            return false;
        }
    }

    save() {
        this.throwIfDisposed();

        try {
            localStorage.setItem(storageKey, JSON.stringify(this.entries));
            return true;
        } catch {
            console.warn("Could not save settings to local storage.");
            return false;
        }
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

        this.onLocaleChanged.dispose();
        this.onVolumeChanged.dispose();
        this.onShowHintsChanged.dispose();
        this.onShowFpsChanged.dispose();
        this.onResolutionChanged.dispose();
        this.onMaxFpsChanged.dispose();
    }
}
