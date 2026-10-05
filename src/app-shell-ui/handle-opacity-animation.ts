import { Animation } from "../animation/animation";

const hiddenClassName = "hidden";

export async function handleOpacityAnimationShow(htmlElement: HTMLElement, animation: Animation, animated: boolean) {
    htmlElement.classList.remove(hiddenClassName);

    if (animated) {
        await animation.play();
        return;
    }

    animation.stop();
    animation.time = animation.length;
    htmlElement.style.opacity = "1";
}

export async function handleOpacityAnimationHide(htmlElement: HTMLElement, animation: Animation, animated: boolean) {
    if (animated) {
        await animation.play({ timeMultiplier: -1 });

        htmlElement.classList.add(hiddenClassName);
        return;
    }

    animation.stop();
    animation.time = 0;
    htmlElement.style.opacity = "0";
    htmlElement.classList.add(hiddenClassName);
}
