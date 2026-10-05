import { Animation } from "../../../animation/animation";
import { AudioService } from "../../../core/audio-service";
import { Color } from "../../../core/Color";
import { Resolution, Settings } from "../../../core/settings";
import { Key, Locale, Localization } from "../../../localization/localization";
import { UIEventBus } from "../../../user-interface/ui-event-bus";
import { DisplayContentRenderer } from "../../display-content-renderer";
import { Panel } from "../display-manager";
import { DisplayContent } from "../display-content";
import { ButtonElement } from "../elements/button-element";
import { HSelectElement } from "../elements/h-select-element";
import { RectElement } from "../elements/rect-element";
import { TextAlignment, TextElement } from "../elements/text-element";
import { createButton } from "../utils/create-button";
import { createDisplayBlurAnimation } from "../utils/create-display-blur-animation";
import { createDisplayScrollAnimation } from "../utils/create-display-scroll-animation";
import { createHorizontalSelect } from "../utils/create-horizontal-select";
import { createLabel } from "../utils/create-label";
import { createNavigationEvents } from "./components/navigation-events";

const scrollProbability = 0.33;

const localeOptions = [
    { text: "English", data: Locale.EN },
    { text: "Polish", data: Locale.PL },
];

const volumeOptions = [
    { text: "0%", data: 0.0 },
    { text: "10%", data: 0.1 },
    { text: "20%", data: 0.2 },
    { text: "30%", data: 0.3 },
    { text: "40%", data: 0.4 },
    { text: "50%", data: 0.5 },
    { text: "60%", data: 0.6 },
    { text: "70%", data: 0.7 },
    { text: "80%", data: 0.8 },
    { text: "90%", data: 0.9 },
    { text: "100%", data: 1.0 },
];

const showHintsOptions = [
    { text: "Enabled", data: true },
    { text: "Disabled", data: false },
];

const showFpsOptions = [
    { text: "Enabled", data: true },
    { text: "Disabled", data: false },
];

const resolutionOptions = [
    { text: "Match 21:9", data: { aspect: 21 / 9 } },
    { text: "Match 16:9", data: { aspect: 16 / 9 } },
    { text: "Match 4:3", data: { aspect: 4 / 3 } },
    { text: "800 x 600", data: { x: 800, y: 600 } },
    { text: "1280 x 720", data: { x: 1280, y: 720 } },
    { text: "1366 x 768", data: { x: 1366, y: 768 } },
    { text: "1440 x 600", data: { x: 1440, y: 600 } },
    { text: "1600 x 900", data: { x: 1600, y: 900 } },
    { text: "1680 x 720", data: { x: 1680, y: 720 } },
    { text: "1920 x 1080", data: { x: 1920, y: 1080 } },
    { text: "2560 x 1080", data: { x: 2560, y: 1080 } },
    { text: "3440 x 1440", data: { x: 3440, y: 1440 } },
    { text: "3840 x 1600", data: { x: 3840, y: 1600 } },
    { text: "3840 x 2160", data: { x: 3840, y: 2160 } },
];

const maxFpsOptions = [
    { text: "30", data: 30 },
    { text: "60", data: 60 },
    { text: "75", data: 75 },
    { text: "90", data: 90 },
    { text: "120", data: 120 },
    { text: "144", data: 144 },
    { text: "165", data: 165 },
    { text: "180", data: 180 },
    { text: "240", data: 240 },
    { text: "Unlimited", data: 0 },
];

interface SettingsPanelContext {
    settings: Settings;
    audioService: AudioService;
    localization: Localization;
    uiEventBus: UIEventBus;
    displayRenderer: DisplayContentRenderer;
}

export class SettingsPanel implements Panel {
    public readonly displayContent = new DisplayContent({ width: 1280, height: 1024 });
    public readonly navigationEvents = createNavigationEvents();

    private ctx: SettingsPanelContext;

    private header: TextElement;
    private localeLabel: TextElement;
    private volumeLabel: TextElement;
    private showHintsLabel: TextElement;
    private showFpsLabel: TextElement;
    private resolutionLabel: TextElement;
    private maxFpsLabel: TextElement;

    private localeSelect: HSelectElement;
    private volumeSelect: HSelectElement;
    private showHintsSelect: HSelectElement;
    private showFpsSelect: HSelectElement;
    private resolutionSelect: HSelectElement;
    private maxFpsSelect: HSelectElement;

    private defaultsButton: ButtonElement;
    private backButton: ButtonElement;

    private scrollAnimation: Animation;
    private blurAnimation: Animation;

    constructor(ctx: SettingsPanelContext) {
        this.ctx = ctx;

        this.createElements();
        this.localize();
        this.assignEvents();

        this.scrollAnimation = createDisplayScrollAnimation(ctx.displayRenderer);
        this.blurAnimation = createDisplayBlurAnimation(ctx.displayRenderer);

        this.ctx.settings.onLocaleChanged.add(() => this.localize());
    }

    async enter() {
        this.updateSelectOptionIndexes();
        this.ctx.uiEventBus.requestHint(Key.SettingsPanelHint);

        this.blurAnimation.time = 0;
        this.blurAnimation.play();

        this.scrollAnimation.time = 0;
        if (Math.random() < scrollProbability) {
            this.ctx.displayRenderer.effects.renderSynced = false;
            await this.scrollAnimation.play();
            this.ctx.displayRenderer.effects.renderSynced = true;
        }
    }

    exit() {
        this.blurAnimation.stop();
        this.scrollAnimation.stop();
    }

    private updateSelectOptionIndexes() {
        this.setSelectOptionIndex(this.localeSelect, this.ctx.settings.locale);
        this.setSelectOptionIndex(this.volumeSelect, this.ctx.settings.volume);
        this.setSelectOptionIndex(this.showHintsSelect, this.ctx.settings.showHints);
        this.setSelectOptionIndex(this.showFpsSelect, this.ctx.settings.showFps);
        this.setSelectOptionIndex(
            this.resolutionSelect,
            this.ctx.settings.resolution,
            (a: Resolution, b: Resolution) =>
                (a.aspect == null && b.aspect == null && a.x === b.x && a.y === b.y) ||
                (a.aspect != null && b.aspect != null && a.aspect === b.aspect),
        );
        this.setSelectOptionIndex(this.maxFpsSelect, this.ctx.settings.maxFps);
    }

    private assignEvents() {
        this.localeSelect.onOptionIndexChanged.add(() => {
            this.ctx.settings.locale = this.localeSelect.currentOption?.data;
            this.ctx.settings.save();
        });

        this.volumeSelect.onOptionIndexChanged.add(() => {
            this.ctx.settings.volume = this.volumeSelect.currentOption?.data;
            this.ctx.settings.save();
        });

        this.showHintsSelect.onOptionIndexChanged.add(() => {
            this.ctx.settings.showHints = this.showHintsSelect.currentOption?.data;
            this.ctx.settings.save();
        });

        this.showFpsSelect.onOptionIndexChanged.add(() => {
            this.ctx.settings.showFps = this.showFpsSelect.currentOption?.data;
            this.ctx.settings.save();
        });

        this.resolutionSelect.onOptionIndexChanged.add(() => {
            this.ctx.settings.resolution = this.resolutionSelect.currentOption?.data;
            this.ctx.settings.save();
        });

        this.maxFpsSelect.onOptionIndexChanged.add(() => {
            this.ctx.settings.maxFps = this.maxFpsSelect.currentOption?.data;
            this.ctx.settings.save();
        });
    }

    private setSelectOptionIndex(selectElement: HSelectElement, data: any, comparator = (a: any, b: any) => a === b) {
        const idx = selectElement.options.findIndex((opt) => comparator(opt.data, data));
        if (idx >= 0) {
            selectElement.setOptionIndex(idx, false);
        }
    }

    private localize() {
        this.header.text = this.ctx.localization.translate(Key.Settings);
        this.localeLabel.text = this.ctx.localization.translate(Key.Locale);
        this.volumeLabel.text = this.ctx.localization.translate(Key.Volume);
        this.showHintsLabel.text = this.ctx.localization.translate(Key.ShowHints);
        this.showFpsLabel.text = this.ctx.localization.translate(Key.ShowFps);
        this.resolutionLabel.text = this.ctx.localization.translate(Key.Resolution);
        this.maxFpsLabel.text = this.ctx.localization.translate(Key.MaxFps);

        localeOptions[0].text = this.ctx.localization.translate(Key.English);
        localeOptions[1].text = this.ctx.localization.translate(Key.Polish);

        showHintsOptions[0].text = this.ctx.localization.translate(Key.Enabled);
        showHintsOptions[1].text = this.ctx.localization.translate(Key.Disabled);

        showFpsOptions[0].text = this.ctx.localization.translate(Key.Enabled);
        showFpsOptions[1].text = this.ctx.localization.translate(Key.Disabled);

        resolutionOptions[0].text = this.ctx.localization.translate(Key.Match) + " 21:9";
        resolutionOptions[1].text = this.ctx.localization.translate(Key.Match) + " 16:9";
        resolutionOptions[2].text = this.ctx.localization.translate(Key.Match) + " 4:3";

        maxFpsOptions[maxFpsOptions.length - 1].text = this.ctx.localization.translate(Key.Unlimited);

        this.defaultsButton.text = this.ctx.localization.translate(Key.Defaults);
        this.backButton.text = this.ctx.localization.translate(Key.Back);
    }

    private createElements() {
        const header = createLabel({ x: 64, y: 64, z: 8, width: 1152, height: 48 });
        header.name = "header";
        this.displayContent.add(header);
        this.header = header;

        const headerBar = new RectElement();
        headerBar.name = "header-bar";
        headerBar.color = Color.white;
        headerBar.layout.set({ x: 64, y: 126, z: 8, width: 1152, height: 4 });
        this.displayContent.add(headerBar);

        const labelOptions: {
            x: number;
            z: number;
            width: number;
            height: number;
            align: TextAlignment;
            fontSize: number;
        } = { x: 64, z: 8, width: 544, height: 48, align: "left", fontSize: 42 };

        const localeLabel = createLabel({ y: 176, ...labelOptions });
        localeLabel.name = "locale-label";
        this.displayContent.add(localeLabel);
        this.localeLabel = localeLabel;

        const volumeLabel = createLabel({ y: 288, ...labelOptions });
        volumeLabel.name = "volume-label";
        this.displayContent.add(volumeLabel);
        this.volumeLabel = volumeLabel;

        const showHintsLabel = createLabel({ y: 400, ...labelOptions });
        showHintsLabel.name = "show-hints-label";
        showHintsLabel.pointerEvents.interactive = true;
        showHintsLabel.pointerEvents.addEventListener("onpointerenter", () =>
            this.ctx.uiEventBus.requestHint(Key.ShowHintsHint),
        );
        this.displayContent.add(showHintsLabel);
        this.showHintsLabel = showHintsLabel;

        const showFpsLabel = createLabel({ y: 512, ...labelOptions });
        showFpsLabel.name = "show-fps-label";
        showFpsLabel.pointerEvents.interactive = true;
        showFpsLabel.pointerEvents.addEventListener("onpointerenter", () =>
            this.ctx.uiEventBus.requestHint(Key.ShowFpsHint),
        );
        this.displayContent.add(showFpsLabel);
        this.showFpsLabel = showFpsLabel;

        const resolutionLabel = createLabel({ y: 624, ...labelOptions });
        resolutionLabel.name = "resolution-label";
        resolutionLabel.pointerEvents.interactive = true;
        resolutionLabel.pointerEvents.addEventListener("onpointerenter", () =>
            this.ctx.uiEventBus.requestHint(Key.ResolutionHint),
        );
        this.displayContent.add(resolutionLabel);
        this.resolutionLabel = resolutionLabel;

        const maxFpsLabel = createLabel({ y: 736, ...labelOptions });
        maxFpsLabel.text = "max-fps-label";
        maxFpsLabel.pointerEvents.interactive = true;
        maxFpsLabel.pointerEvents.addEventListener("onpointerenter", () =>
            this.ctx.uiEventBus.requestHint(Key.MaxFpsHint),
        );
        this.displayContent.add(maxFpsLabel);
        this.maxFpsLabel = maxFpsLabel;

        const selectOptions = {
            x: 672,
            z: 8,
            width: 544,
            height: 80,
            audioService: this.ctx.audioService,
        };

        const localeSelect = createHorizontalSelect({ y: 160, ...selectOptions });
        localeSelect.name = "locale-select";
        localeSelect.options = localeOptions;
        this.displayContent.add(localeSelect);
        this.localeSelect = localeSelect;

        const volumeSelect = createHorizontalSelect({ y: 272, ...selectOptions });
        volumeSelect.name = "volume-select";
        volumeSelect.options = volumeOptions;
        this.displayContent.add(volumeSelect);
        this.volumeSelect = volumeSelect;

        const showHintsSelect = createHorizontalSelect({ y: 384, ...selectOptions });
        showHintsSelect.name = "show-hints-select";
        showHintsSelect.options = showHintsOptions;
        this.displayContent.add(showHintsSelect);
        this.showHintsSelect = showHintsSelect;

        const showFpsSelect = createHorizontalSelect({ y: 496, ...selectOptions });
        showFpsSelect.name = "show-fps-select";
        showFpsSelect.options = showFpsOptions;
        this.displayContent.add(showFpsSelect);
        this.showFpsSelect = showFpsSelect;

        const resolutionSelect = createHorizontalSelect({ y: 608, ...selectOptions });
        resolutionSelect.name = "resolution-select";
        resolutionSelect.options = resolutionOptions;
        this.displayContent.add(resolutionSelect);
        this.resolutionSelect = resolutionSelect;

        const maxFpsSelect = createHorizontalSelect({ y: 720, ...selectOptions });
        maxFpsSelect.name = "max-fps-select";
        maxFpsSelect.options = maxFpsOptions;
        this.displayContent.add(maxFpsSelect);
        this.maxFpsSelect = maxFpsSelect;

        const buttonOptions = {
            z: 8,
            width: 320,
            height: 80,
            audioService: this.ctx.audioService,
        };

        const defaultsButton = createButton({ x: 896, y: 880, ...buttonOptions });
        defaultsButton.name = "defaults-button";
        defaultsButton.pointerEvents.addEventListener("onpointerenter", () =>
            this.ctx.uiEventBus.requestHint(Key.DefaultsButtonHint),
        );
        defaultsButton.pointerEvents.addEventListener("onclick", () => {
            this.ctx.settings.setDefault();
            this.ctx.settings.save();
            this.updateSelectOptionIndexes();
        });
        this.displayContent.add(defaultsButton);
        this.defaultsButton = defaultsButton;

        const backButton = createButton({ x: 64, y: 880, ...buttonOptions });
        backButton.name = "back-button";
        this.displayContent.add(backButton);
        this.backButton = backButton;

        backButton.pointerEvents.addEventListener("onclick", () => this.navigationEvents.requestBack());
    }
}
