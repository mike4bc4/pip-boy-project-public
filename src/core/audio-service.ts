import { AppError, ObjectDisposedError } from "../app-error";
import { AssetDatabase, AudioAsset } from "../assets/asset-database";
import { InputSystem } from "../input/input-system";
import { Action } from "./Action";
import { Disposable } from "./disposable";
import { Settings } from "./settings";

export enum AudioTrackName {
    TerminalHighFrequency = "/audio/terminal-high-frequency",
    TerminalScroll = "/audio/terminal-scroll",
    Tweet = "/audio/tweet",
    TerminalLowFrequency = "/audio/terminal-low-frequency",
    Twoot = "/audio/twoot",
    Cancel = "/audio/cancel",
    OK = "/audio/ok",
    Focus = "/audio/focus",
    Death = "/audio/game/death",
    Jump = "/audio/game/jump",
    PickUp = "/audio/game/pick-up",
    Run = "/audio/game/run",
    Shoot = "/audio/game/shoot",
    StimpakUse = "/audio/game/stimpak-use",
    SynthDeath = "/audio/game/synth-death",
    VertibirdDeath = "/audio/game/vertibird-death",
}

export interface AudioTrack {
    loop: boolean;
    volume: number;

    stop(fadeTime: number): void;
    pause(): AudioTrack;
    play(): AudioTrack;
    rewind(): AudioTrack;
}

class AudioTrackImpl implements AudioTrack {
    public readonly onEnded = new Action();

    private context: AudioContext;
    private masterGain: GainNode;
    private audioBuffer: AudioBuffer;

    private source: AudioBufferSourceNode | null = null;
    private gain: GainNode | null = null;

    private state: "started" | "stopped" | "paused" | "stop-requested" = "paused";
    private pauseOffset = 0;
    private startTime = 0;

    private _loop = false;
    private _volume = 1;

    get loop() {
        return this._loop;
    }

    set loop(value) {
        this._loop = value;
        if (this.source) {
            this.source.loop = value;
        }
    }

    get volume() {
        return this._volume;
    }

    set volume(value) {
        this._volume = value;
        if (this.gain) {
            this.gain.gain.value = value;
        }
    }

    constructor(context: AudioContext, masterGain: GainNode, audioBuffer: AudioBuffer) {
        this.context = context;
        this.masterGain = masterGain;
        this.audioBuffer = audioBuffer;
    }

    rewind() {
        this.pauseOffset = 0;
        return this;
    }

    play() {
        if (this.state === "stopped" || this.state === "stop-requested") {
            throw new AppError("Audio track was stopped or requested to stop, and cannot be played anymore.");
        }

        if (this.state === "started") {
            return this;
        }

        this.state = "started";
        this.startTime = this.context.currentTime;

        const source = this.context.createBufferSource();
        this.source = source;
        this.source.buffer = this.audioBuffer;
        this.source.loop = this.loop;

        const gain = this.context.createGain();
        this.gain = gain;
        this.gain.gain.value = this.volume;

        const handleSourceEnded = () => {
            if (this.state !== "paused") {
                this.state = "stopped";

                if (!this.onEnded.disposed) {
                    this.onEnded.invoke();
                }
            }

            source.removeEventListener("ended", handleSourceEnded);
            source.disconnect();
            gain.disconnect();
        };

        this.source.addEventListener("ended", handleSourceEnded);

        this.source.connect(this.gain);
        this.gain.connect(this.masterGain);

        this.source.start(0, this.pauseOffset);
        return this;
    }

    pause() {
        if (this.state === "paused" || this.state === "stopped" || this.state === "stop-requested") {
            return this;
        }

        this.state = "paused";

        this.pauseOffset = (this.pauseOffset + this.context.currentTime - this.startTime) % this.audioBuffer.duration;

        this.source?.stop();
        return this;
    }

    stop(fadeTime: number) {
        if (this.state === "stopped" || this.state === "stop-requested") {
            return;
        }

        if (this.state === "paused") {
            // Source has already been stopped, but did not fire an event, so we are just
            // triggering it manually here.
            this.state = "stopped";
            this.onEnded.invoke();
            return;
        }

        this.state = "stop-requested";

        if (fadeTime <= 0) {
            this.source?.stop();
        } else {
            const now = this.context.currentTime;
            this.gain?.gain.cancelScheduledValues(now);
            this.gain?.gain.setValueAtTime(this.gain.gain.value, now);
            this.gain?.gain.linearRampToValueAtTime(0, now + fadeTime);

            this.source?.stop(now + fadeTime);
        }
    }
}

export class AudioService implements Disposable {
    private inputSystem: InputSystem;
    private settings: Settings;
    private context: AudioContext;
    private audioBuffers = new Map<string, AudioBuffer>();
    private masterGain: GainNode;
    private _disposed = false;
    private audioTracks = new Set<AudioTrackImpl>();

    get disposed() {
        return this._disposed;
    }

    get contextState() {
        return this.context.state;
    }

    private constructor() {}

    private async init(inputSystem: InputSystem, settings: Settings) {
        this.inputSystem = inputSystem;
        this.settings = settings;

        this.context = new AudioContext();

        this.inputSystem.onKeyDown.add(this.handleKeyDownOrPointerUp);
        this.inputSystem.onPointerUp.add(this.handleKeyDownOrPointerUp);

        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);

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
            for (const audioTrack of this.audioTracks) {
                audioTrack.stop(0);
                audioTrack.onEnded.dispose();
            }

            this.context = new AudioContext();

            this.masterGain.disconnect();
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);

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

    createAudioTrack(trackName: string): AudioTrack {
        if (this.disposed) {
            throw new ObjectDisposedError();
        }

        const buffer = this.audioBuffers.get(trackName);

        if (!buffer) {
            throw new AppError(`Audio asset "${trackName}" not available.`);
        }

        const audioTrack = new AudioTrackImpl(this.context, this.masterGain, buffer);
        this.audioTracks.add(audioTrack);

        audioTrack.onEnded.add(() => {
            this.audioTracks.delete(audioTrack);
            (audioTrack as AudioTrackImpl).onEnded.dispose();
        });

        return audioTrack;
    }

    static async create(inputSystem: InputSystem, settings: Settings) {
        return await new AudioService().init(inputSystem, settings);
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
            audioTrack.stop(0);
            audioTrack.onEnded.dispose();
        }

        this.audioTracks.clear();

        this.masterGain?.disconnect();

        this.audioBuffers.clear();
        this.context?.close().catch((reason) => {
            console.error("Failed to close audio context.", reason);
        });
    }
}
