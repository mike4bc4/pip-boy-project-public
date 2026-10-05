import { AudioService, AudioTrackName } from "../../../core/audio-service";
import { ButtonElement } from "../elements/button-element";
import { VisualElement } from "../elements/visual-element";

export function assignButtonSounds(audioService: AudioService, button: ButtonElement) {
    const enterCallback = () => audioService.play(AudioTrackName.Focus);
    const downCallback = () => audioService.play(AudioTrackName.OK);
    const upCallback = (target?: VisualElement | null) => {
        if (target !== button) {
            audioService.play(AudioTrackName.Cancel);
        }
    };

    button.pointerEvents.addEventListener("onpointerenter", enterCallback);
    button.pointerEvents.addEventListener("onpointerdown", downCallback);
    button.pointerEvents.addEventListener("onpointerup", upCallback);

    return { enterCallback, downCallback, upCallback };
}
