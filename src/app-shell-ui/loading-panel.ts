import { Settings } from "../core/settings";
import { Key, Localization } from "../localization/localization";
import { AppShellUIPanel } from "./app-shell-ui";
import { cls } from "./cls";
import { createOpacityAnimation } from "./create-opacity-animation";
import { handleOpacityAnimationHide, handleOpacityAnimationShow } from "./handle-opacity-animation";

const rootClass = cls("loading-panel");
const progressBarClass = cls("progress-bar");
const labelClass = cls(progressBarClass.name + "_label");
const barClass = cls(progressBarClass.name + "_bar");
const barLabelClass = cls(progressBarClass.name + "_bar-label");

interface LoadingPanelContext {
    settings: Settings;
    localization: Localization;
}

export class LoadingPanel implements AppShellUIPanel {
    public enabled = false;

    private ctx: LoadingPanelContext;

    private root = document.querySelector(rootClass.selector) as HTMLDivElement;
    private progressBar = this.root.querySelector(progressBarClass.selector) as HTMLDivElement;
    private labelElement = this.root.querySelector(labelClass.selector) as HTMLParagraphElement;
    private bar = this.root.querySelector(barClass.selector) as HTMLDivElement;
    private barLabel = this.root.querySelector(barLabelClass.selector) as HTMLParagraphElement;

    private rootOpacityAnimation = createOpacityAnimation(this.root);
    private progressBarOpacityAnimation = createOpacityAnimation(this.progressBar);

    constructor(ctx: LoadingPanelContext) {
        this.ctx = ctx;

        this.setProgress(0);

        this.localizeLabel();
        ctx.settings.onLocaleChanged.add(() => this.localizeLabel());
    }

    private localizeLabel() {
        this.labelElement.innerText = this.ctx.localization.translate(Key.Loading);
    }

    setProgress(progress: number) {
        const clampedProgress = Math.max(0, Math.min(1, progress));
        this.bar.style.width = `${clampedProgress * 100}%`;
        this.barLabel.innerText = `${(clampedProgress * 100).toFixed(0)}%`;
    }

    show(animated = false) {
        return handleOpacityAnimationShow(this.root, this.rootOpacityAnimation, animated);
    }

    hide(animated = false) {
        return handleOpacityAnimationHide(this.root, this.rootOpacityAnimation, animated);
    }

    showProgressBar(animated = false) {
        return handleOpacityAnimationShow(this.progressBar, this.progressBarOpacityAnimation, animated);
    }

    hideProgressBar(animated = false) {
        return handleOpacityAnimationHide(this.progressBar, this.progressBarOpacityAnimation, animated);
    }
}
