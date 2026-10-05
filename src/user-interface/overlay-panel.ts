import { Animation } from "../animation/animation";
import { cls } from "../app-shell-ui/cls";
import { createOpacityAnimation } from "../app-shell-ui/create-opacity-animation";
import { handleOpacityAnimationHide, handleOpacityAnimationShow } from "../app-shell-ui/handle-opacity-animation";
import { Key } from "../localization/localization";
import { UIPanel } from "./ui-manager";
import { UIEventBus } from "./ui-event-bus";

const rootClass = cls("overlay-panel");
const mutedIconClass = cls(rootClass.name + "_muted-icon");

interface OverlayPanelContext {
    uiEventBus: UIEventBus;
}

export class OverlayPanel implements UIPanel {
    public enabled: boolean = true;

    private ctx: OverlayPanelContext;

    private root: HTMLDivElement;
    private mutedIcon: HTMLDivElement;

    private rootOpacityAnimation: Animation;
    private mutedIconAnimation: Animation;

    constructor(ctx: OverlayPanelContext) {
        this.ctx = ctx;

        this.root = document.querySelector(rootClass.selector) as HTMLDivElement;
        this.mutedIcon = this.root.querySelector(mutedIconClass.selector) as HTMLDivElement;

        this.rootOpacityAnimation = createOpacityAnimation(this.root);
        this.mutedIconAnimation = createOpacityAnimation(this.mutedIcon);

        this.mutedIcon.addEventListener("pointerenter", (event: PointerEvent) => {
            if (event.pointerType !== "touch") {
                this.ctx.uiEventBus.requestHint(Key.MutedIconHover);
            }
        });

        this.mutedIcon.addEventListener("pointerdown", (event: PointerEvent) => {
            if (event.pointerType === "touch") {
                this.ctx.uiEventBus.requestHint(Key.MutedIconHover);
            }
        });
    }

    show(animated = false) {
        return handleOpacityAnimationShow(this.root, this.rootOpacityAnimation, animated);
    }

    hide(animated = false) {
        return handleOpacityAnimationHide(this.root, this.rootOpacityAnimation, animated);
    }

    showMutedIcon(animated = false) {
        return handleOpacityAnimationShow(this.mutedIcon, this.mutedIconAnimation, animated);
    }

    hideMutedIcon(animated = false) {
        return handleOpacityAnimationHide(this.mutedIcon, this.mutedIconAnimation, animated);
    }
}
