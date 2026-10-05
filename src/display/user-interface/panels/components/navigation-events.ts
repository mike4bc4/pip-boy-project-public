import { Action } from "../../../../core/Action";
import { PanelType } from "../../display-manager";

export interface NavigationEvents {
    requestNavigation(panelType: PanelType): void;
    requestBack(): void;
}

export interface NavigationEventsInternal extends NavigationEvents {
    readonly onNavigateRequest: Action<[panelType: PanelType]>;
    readonly onBackRequest: Action;
}

class NavigationEventsImpl implements NavigationEventsInternal {
    public readonly onNavigateRequest = new Action<[panelType: PanelType]>();
    public readonly onBackRequest = new Action();

    public requestNavigation(panelType: PanelType) {
        this.onNavigateRequest.invoke(panelType);
    }

    public requestBack() {
        this.onBackRequest.invoke();
    }
}

export function createNavigationEvents(): NavigationEvents {
    return new NavigationEventsImpl();
}
