import { AppError, ObjectDisposedError } from "../app-error";
import { AssetDatabase, AudioAsset } from "../assets/asset-database";
import { InputSystem } from "../input/input-system";
import { Action } from "./Action";
import { Disposable } from "./disposable";
import { Settings } from "./settings";
import { Timer, TimerService } from "./timer-service";

const playTimeout = 0.05;

export enum AudioTrackName {
    TerminalHighFrequency = "/audio/terminal-high-frequency",
    TerminalScroll = "/audio/terminal-scroll",
    Tweet = "/audio/tweet",
    TerminalLowFrequency = "/audio/terminal-low-frequency",
    Twoot = "/audio/twoot",
    Cancel = "/audio/cancel",
    OK = "/audio/ok",
    Focus = "/audio/focus",
}

export interface AudioTrack {
    stop: (fadeTime: number) => void;
}

class AudioTrackInternal implements AudioTrack, Disposable {
    public readonly onEnded = new Action();

    private context: AudioContext;
    private source: AudioBufferSourceNode;
    private gain: GainNode;
    private stopRequested = false;
    private started = false;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    init(context: AudioContext, source: AudioBufferSourceNode, gain: GainNode) {
        this.throwIfDisposed();

        this.context = context;
        this.source = source;
        this.gain = gain;

        const handleSourceEnded = () => {
            this.source.removeEventListener("ended", handleSourceEnded);

            if (!this.disposed) {
                this.onEnded.invoke();
            }
        };

        this.source.addEventListener("ended", handleSourceEnded);
    }

    play() {
        this.throwIfDisposed();

        if (this.stopRequested || this.started) {
            return;
        }

        this.started = true;
        this.source.start();
    }

    stop(fadeTime: number) {
        this.throwIfDisposed();

        this.stopRequested = true;

        if (!this.started) {
            return;
        }

        const safeFadeTime = Math.max(0.001, fadeTime);
        const now = this.context.currentTime;

        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setValueAtTime(this.gain.gain.value, now);
        this.gain.gain.linearRampToValueAtTime(0, now + safeFadeTime);

        const { promise, resolve } = Promise.withResolvers<void>();
        const handleSourceEnded = () => {
            this.source.removeEventListener("ended", handleSourceEnded);

            if (!this.disposed) {
                this.onEnded.invoke();
            }

            resolve();
        };

        this.source.addEventListener("ended", handleSourceEnded);
        this.source.stop(now + safeFadeTime);

        return promise;
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

        // stop() can throw if start() was not called first, so we are guarding here
        // just in case. Catch is empty as otherwise there is nothing to stop.
        try {
            this.source?.stop();
        } catch {}

        this.source?.disconnect();
        this.gain?.disconnect();

        this.onEnded.dispose();
    }
}

export class AudioService implements Disposable {
    private inputSystem: InputSystem;
    private settings: Settings;
    private timerService: TimerService;
    private context: AudioContext;
    private audioBuffers = new Map<string, AudioBuffer>();
    private masterGain: GainNode;
    private _disposed = false;
    private audioTracks = new Set<AudioTrackInternal>();

    get disposed() {
        return this._disposed;
    }

    get contextState() {
        return this.context.state;
    }

    private constructor() {}

    private async init(inputSystem: InputSystem, settings: Settings, timerService: TimerService) {
        this.inputSystem = inputSystem;
        this.settings = settings;
        this.timerService = timerService;

        this.context = new AudioContext();

        this.inputSystem.onKeyDown.add(this.handleKeyDownOrPointerUp);
        this.inputSystem.onPointerUp.add(this.handleKeyDownOrPointerUp);

        this.masterGain = this.context.createGain();
        this.updateMasterGain();
        this.settings.onVolumeChanged.add(this.updateMasterGain);

        return this;
    }

    private handleKeyDownOrPointerUp = () => {
        this.tryResume();
    };

    tryResume() {
        if (this.disposed) {
            throw new ObjectDisposedError();
        }

        if (this.context.state === "running") {
            return;
        } else if (this.context.state === "suspended" || this.context.state === "interrupted") {
            this.context.resume().catch((err) => console.log(err));
        } else {
            this.context = new AudioContext();
            this.context.resume().catch((err) => console.log(err));
        }
    }

    private updateMasterGain = () => {
        this.masterGain.gain.value = this.settings.volume * 2.0;
    };

    async load(assetDatabase: AssetDatabase, onProgress?: (progress: { completed: number; total: number }) => void) {
        const audioAssets = assetDatabase.getAssetsByType(AudioAsset);

        let completed = 0;

        for (const asset of audioAssets) {
            const buffer = await this.context.decodeAudioData(asset.arrayBuffer);
            this.audioBuffers.set(asset.id, buffer);

            completed += 1;
            onProgress?.({ completed, total: audioAssets.length });
        }
    }

    private waitForRunning() {
        if (this.context.state === "running") {
            return Promise.resolve(true);
        }

        const { promise: stateChangePromise, resolve } = Promise.withResolvers<boolean>();

        const handleStateChange = () => {
            if (this.context.state === "running") {
                resolve(true);
                cleanup();
            }
        };

        this.context.addEventListener("statechange", handleStateChange);

        let timer: Timer;
        const timeoutPromise = new Promise<boolean>((resolve) => {
            timer = this.timerService.timeout(
                () => {
                    resolve(false);
                    cleanup();
                },
                playTimeout,
                false,
            );
        });

        const cleanup = () => {
            timer.cancel();
            this.context.removeEventListener("statechange", handleStateChange);
        };

        return Promise.any([stateChangePromise, timeoutPromise]);
    }

    play(id: string, loop = false): AudioTrack {
        if (this.disposed) {
            throw new ObjectDisposedError();
        }

        let audioTrack = new AudioTrackInternal();
        this.audioTracks.add(audioTrack);

        audioTrack.onEnded.add(() => {
            this.audioTracks.delete(audioTrack);
            audioTrack.dispose();
        });

        const buffer = this.audioBuffers.get(id);

        if (!buffer) {
            console.warn(`Audio asset "${id}" not available.`);
            return audioTrack;
        }

        this.waitForRunning()
            .then((canPlay) => {
                if (!canPlay || this.disposed) {
                    return;
                }

                const source = this.context.createBufferSource();
                const gain = this.context.createGain();

                source.buffer = buffer;
                source.loop = loop;

                source.connect(gain);
                gain.connect(this.masterGain);
                this.masterGain.connect(this.context.destination);

                gain.gain.value = 1;

                audioTrack.init(this.context, source, gain);
                audioTrack.play();
            })
            .catch((reason) => {
                throw new AppError("Play failed.", { cause: reason });
            });

        return audioTrack;
    }

    static async create(inputSystem: InputSystem, settings: Settings, timerService: TimerService) {
        return await new AudioService().init(inputSystem, settings, timerService);
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.inputSystem?.onKeyDown.remove(this.handleKeyDownOrPointerUp);
        this.inputSystem?.onPointerUp.remove(this.handleKeyDownOrPointerUp);
        this.settings?.onVolumeChanged.remove(this.updateMasterGain);

        for (const audioTrack of this.audioTracks) {
            audioTrack.dispose();
        }

        this.audioTracks.clear();

        this.masterGain?.disconnect();

        this.audioBuffers.clear();
        this.context?.close().catch((reason) => {
            console.error("Failed to close audio context.", reason);
        });
    }
}
