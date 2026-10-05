import { AppShellUIPanel } from "./app-shell-ui";
import { cls } from './cls';

const rootClass = cls("black-panel");
const hiddenClass = cls("hidden");

export class BlackPanel implements AppShellUIPanel {
    public enabled = false;

    private root: HTMLDivElement;

    constructor() {
        this.root = document.querySelector(rootClass.selector) as HTMLDivElement;
    }

    show() {
        this.root.classList.remove(hiddenClass.name);
    }

    hide() {
        this.root.classList.add(hiddenClass.name);
    }
}
