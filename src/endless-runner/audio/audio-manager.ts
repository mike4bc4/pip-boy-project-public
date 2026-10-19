import { EventBus } from "@game/core/event-bus";
import { AudioService, AudioTrack, AudioTrackName } from "../../core/audio-service";
import { Vertibird } from "@game/enemy/vertibird";
import { Synth } from "@game/enemy/synth";
import { Disposable } from "../../core/disposable";
import { VaultBoy } from "@game/core/vault-boy";

const volume = {
    run: 0.3,
    jump: 0.3,
    shoot: 1.75,
    pickUp: 1.25,
    killed: 0.5,
    synthDeath: 1,
    vertibirdDeath: 0.75,
    stimpakUsed: 0.8,
};

interface AudioManagerContext {
    eventBus: EventBus;
    audioService: AudioService;
    vaultBoy: VaultBoy;
}

export class AudioManager implements Disposable {
    private ctx: AudioManagerContext;

    private listenerRemoveCallbacks: (() => void)[] = [];
    private runAudioTrack: AudioTrack | null = null;

    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    private get audioService() {
        return this.ctx.audioService;
    }

    private get eventBus() {
        return this.ctx.eventBus;
    }

    constructor(ctx: AudioManagerContext) {
        this.ctx = ctx;
        this.attachListeners();
    }

    reset() {
        this.runAudioTrack?.stop(0);
        this.runAudioTrack = null;
    }

    private detachListeners() {
        for (const callback of this.listenerRemoveCallbacks) {
            callback();
        }

        this.listenerRemoveCallbacks.length = 0;
    }

    private attachListeners() {
        this.detachListeners();

        this.listenerRemoveCallbacks.push(
            this.eventBus.vaultBoy.onGrounded.add(() => {
                if (!this.runAudioTrack) {
                    this.runAudioTrack = this.audioService.createAudioTrack(AudioTrackName.Run).play();
                    this.runAudioTrack.volume = volume.run;
                    this.runAudioTrack.loop = true;
                } else {
                    this.runAudioTrack.rewind().play();
                }
            }),
        );

        this.listenerRemoveCallbacks.push(
            this.eventBus.vaultBoy.onJump.add(() => {
                this.runAudioTrack?.pause();
                this.audioService.createAudioTrack(AudioTrackName.Jump).play().volume = volume.jump;
            }),
        );

        this.listenerRemoveCallbacks.push(
            this.eventBus.vaultBoy.onKilled.add(() => {
                this.runAudioTrack?.stop(0);
                this.runAudioTrack = null;
                this.audioService.createAudioTrack(AudioTrackName.Death).play().volume = volume.killed;
            }),
        );

        this.listenerRemoveCallbacks.push(
            this.eventBus.vaultBoy.onStimpakCountChanged.add((lastCount, count) => {
                if (count < lastCount) {
                    this.audioService.createAudioTrack(AudioTrackName.StimpakUse).play().volume = volume.stimpakUsed;
                }
            }),
        );

        this.listenerRemoveCallbacks.push(
            this.eventBus.onWeaponFired.add(() => {
                this.audioService.createAudioTrack(AudioTrackName.Shoot).play().volume = volume.shoot;
            }),
        );

        this.listenerRemoveCallbacks.push(
            this.eventBus.item.onCollected.add(() => {
                this.audioService.createAudioTrack(AudioTrackName.PickUp).play().volume = volume.pickUp;
            }),
        );

        this.listenerRemoveCallbacks.push(
            this.eventBus.game.onPaused.add(() => {
                this.runAudioTrack?.pause();
            }),
        );

        this.listenerRemoveCallbacks.push(
            this.eventBus.game.onResumed.add(() => {
                if (this.ctx.vaultBoy.grounded) {
                    this.runAudioTrack?.play();
                }
            }),
        );

        this.listenerRemoveCallbacks.push(
            this.eventBus.enemy.onKilled.add((enemy) => {
                if (enemy instanceof Vertibird) {
                    this.audioService.createAudioTrack(AudioTrackName.VertibirdDeath).play().volume =
                        volume.vertibirdDeath;
                } else if (enemy instanceof Synth) {
                    this.audioService.createAudioTrack(AudioTrackName.SynthDeath).play();
                }
            }),
        );
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.detachListeners();
        this.reset();
    }
}
