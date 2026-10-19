import { Color } from "../../core/Color";
import { DisplayContent } from "../../display/user-interface/display-content";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { BorderPosition, RectElement } from "../../display/user-interface/elements/rect-element";
import { TextElement } from "../../display/user-interface/elements/text-element";
import { VisualElement } from "../../display/user-interface/elements/visual-element";
import { Key, Localization } from "../../localization/localization";
import { PointerType } from "../../input/input-system";

const zOffset = 200;

interface HelpDialogContext {
    displayContent: DisplayContent;
    spriteSheet: HTMLImageElement;
    localization: Localization;
}

export class HelpDialog implements DialogBox {
    private ctx: HelpDialogContext;

    private background: RectElement;
    private header: TextElement;
    private headerBar: RectElement;
    private jumpLabel: TextElement;
    private jumpLabelBackground: RectElement;
    private jumpLabelValue: TextElement;
    private shootLabel: TextElement;
    private shootLabelBackground: RectElement;
    private shootLabelValue: TextElement;
    private collectItemsLabel: TextElement;
    private item1Image: ImageElement;
    private item1ImageOverlay: RectElement;
    private item2Image: ImageElement;
    private item2ImageOverlay: RectElement;
    private destroyEnemiesLabel: TextElement;
    private enemy1Image: ImageElement;
    private enemy1ImageOverlay: RectElement;
    private enemy2Image: ImageElement;
    private enemy2ImageOverlay: RectElement;
    private scoreBarLeft: RectElement;
    private scoreBarRight: RectElement;
    private highestScoreLabel: TextElement;

    private _visible = true;

    get visible() {
        return this._visible;
    }

    set visible(value) {
        this._visible = value;
        for (const element of this.elements) {
            element.visible = value;
        }
    }

    get elements(): VisualElement[] {
        return [
            this.background,
            this.header,
            this.headerBar,
            this.jumpLabel,
            this.jumpLabelBackground,
            this.jumpLabelValue,
            this.shootLabel,
            this.shootLabelBackground,
            this.shootLabelValue,
            this.collectItemsLabel,
            this.item1Image,
            this.item1ImageOverlay,
            this.item2Image,
            this.item2ImageOverlay,
            this.destroyEnemiesLabel,
            this.enemy1Image,
            this.enemy1ImageOverlay,
            this.enemy2Image,
            this.enemy2ImageOverlay,
            this.scoreBarLeft,
            this.scoreBarRight,
            this.highestScoreLabel,
        ];
    }

    private get localization() {
        return this.ctx.localization;
    }

    private get displayContent() {
        return this.ctx.displayContent;
    }

    constructor(ctx: HelpDialogContext) {
        this.ctx = ctx;

        this.createElements();
    }

    localizeInputLabels(pointerType: PointerType) {
        this.jumpLabelValue.text =
            pointerType === "touch"
                ? `${this.localization.translate(Key.TapLeft)}`
                : `[${this.localization.translate(Key.Space)}]`;

        this.shootLabel.text = `${this.localization.translate(Key.Shoot)}:`;

        this.shootLabelValue.text =
            pointerType === "touch"
                ? `${this.localization.translate(Key.TapRight)}`
                : `[${this.localization.translate(Key.ControlLeft)}]`;
    }

    localizeBestScoreLabel(bestScore: number) {
        this.highestScoreLabel.text = `${this.localization.translate(Key.BestScore)}: ${Math.round(bestScore)}`;
    }

    localizeElements(bestScore: number, pointerType: PointerType) {
        this.header.text = this.localization.translate(Key.Help);
        this.jumpLabel.text = `${this.localization.translate(Key.Jump)}:`;

        this.collectItemsLabel.text = `${this.localization.translate(Key.CollectItems)}:`;
        this.destroyEnemiesLabel.text = `${this.localization.translate(Key.DestroyEnemies)}:`;

        this.localizeBestScoreLabel(bestScore);
        this.localizeInputLabels(pointerType);
    }

    private createElements() {
        const background = new RectElement();
        this.displayContent.add(background);
        background.name = "help-background";

        background.layout.set({ x: 224, y: 160, z: zOffset, width: 832, height: 656 });
        background.color = Color.black;
        background.borderWidth = 4;
        background.borderPosition = BorderPosition.Inside;
        background.borderColor = Color.white;

        const helpHeader = new TextElement();
        this.displayContent.add(helpHeader);
        helpHeader.name = "help-header";

        helpHeader.layout.set({ x: 256, y: 192, z: zOffset + 1, width: 768, height: 48 });
        helpHeader.color = Color.white;
        helpHeader.align = "center";
        helpHeader.baseline = "middle";
        helpHeader.fontSize = 48;

        const helpHeaderBar = new RectElement();
        this.displayContent.add(helpHeaderBar);
        helpHeaderBar.name = "help-header-bar";

        helpHeaderBar.layout.set({ x: 256, y: 254, z: zOffset, width: 768, height: 4 });
        helpHeaderBar.color = Color.white;

        const jumpLabel = new TextElement();
        this.displayContent.add(jumpLabel);
        jumpLabel.name = "jump-label";

        jumpLabel.layout.set({ x: 256, y: 288, z: zOffset + 1, width: 224, height: 64 });
        jumpLabel.color = Color.white;
        jumpLabel.align = "left";
        jumpLabel.baseline = "middle";
        jumpLabel.fontSize = 42;

        const jumpValueBackground = new RectElement();
        this.displayContent.add(jumpValueBackground);
        jumpValueBackground.name = "jump-value-background";

        jumpValueBackground.layout.set({ x: 512, y: 288, z: zOffset + 1, width: 512, height: 64 });
        jumpValueBackground.color = new Color(0.25, 0.25, 0.25);

        const jumpValueLabel = new TextElement();
        this.displayContent.add(jumpValueLabel);
        jumpValueLabel.name = "jump-value-label";

        jumpValueLabel.layout.set({ x: 528, y: 296, z: zOffset + 2, width: 480, height: 48 });
        jumpValueLabel.copyStyle(jumpLabel);
        jumpValueLabel.align = "right";

        const shootLabel = new TextElement();
        this.displayContent.add(shootLabel);
        shootLabel.name = "shoot-label";

        shootLabel.layout.set({ x: 256, y: 384, z: zOffset + 1, width: 224, height: 64 });
        shootLabel.color = Color.white;
        shootLabel.align = "left";
        shootLabel.baseline = "middle";
        shootLabel.fontSize = 42;

        const shootValueBackground = new RectElement();
        this.displayContent.add(shootValueBackground);
        shootValueBackground.name = "shoot-value-background";

        shootValueBackground.layout.set({ x: 512, y: 384, z: zOffset + 1, width: 512, height: 64 });
        shootValueBackground.color = new Color(0.25, 0.25, 0.25);

        const shootValueLabel = new TextElement();
        this.displayContent.add(shootValueLabel);
        shootValueLabel.name = "shoot-value-label";

        shootValueLabel.layout.set({ x: 528, y: 392, z: zOffset + 2, width: 480, height: 48 });
        shootValueLabel.copyStyle(shootLabel);
        shootValueLabel.align = "right";

        const collectItemsLabel = new TextElement();
        this.displayContent.add(collectItemsLabel);
        collectItemsLabel.name = "collect-items-label";

        collectItemsLabel.layout.set({ x: 256, y: 480, z: zOffset + 1, width: 544, height: 80 });
        collectItemsLabel.copyStyle(shootLabel);

        const item1Image = new ImageElement();
        this.displayContent.add(item1Image);
        item1Image.name = "item1-image";

        item1Image.image = this.ctx.spriteSheet;

        item1Image.cutout.set({ x: 784, y: 877, width: 128, height: 128 });
        item1Image.layout.set({ x: 832, y: 488, z: zOffset + 1, width: 80, height: 80 });

        const item1ImageOverlay = new RectElement();
        this.displayContent.add(item1ImageOverlay);
        item1ImageOverlay.name = "item1-image-overlay";

        item1ImageOverlay.layout.copy(item1Image.layout);
        item1ImageOverlay.compositeOperation = "screen";
        item1ImageOverlay.borderColor = Color.white;
        item1ImageOverlay.borderWidth = 2;
        item1ImageOverlay.borderPosition = BorderPosition.Inside;
        item1ImageOverlay.color = new Color(0.25, 0.25, 0.25);

        const item2Image = new ImageElement();
        this.displayContent.add(item2Image);
        item2Image.name = "item2-image";

        item2Image.image = this.ctx.spriteSheet;

        item2Image.cutout.set({ x: 1056, y: 877, width: 128, height: 128 });
        item2Image.layout.set({ x: 944, y: 488, z: zOffset + 1, width: 80, height: 80 });

        const item2ImageOverlay = new RectElement();
        this.displayContent.add(item2ImageOverlay);
        item2ImageOverlay.name = "item2-image-overlay";

        item2ImageOverlay.layout.copy(item2Image.layout);
        item2ImageOverlay.compositeOperation = "screen";
        item2ImageOverlay.copyStyle(item1ImageOverlay);

        const destroyEnemiesLabel = new TextElement();
        this.displayContent.add(destroyEnemiesLabel);
        destroyEnemiesLabel.name = "destroy-enemies-label";

        destroyEnemiesLabel.layout.set({ x: 256, y: 592, z: zOffset + 1, width: 544, height: 80 });
        destroyEnemiesLabel.copyStyle(shootLabel);

        const enemy1Image = new ImageElement();
        this.displayContent.add(enemy1Image);
        enemy1Image.name = "enemy1-image";

        enemy1Image.image = this.ctx.spriteSheet;

        enemy1Image.cutout.set({ x: 1192, y: 902, width: 128, height: 128 });
        enemy1Image.layout.set({ x: 832, y: 592, z: zOffset + 1, width: 80, height: 80 });

        const enemy1ImageOverlay = new RectElement();
        this.displayContent.add(enemy1ImageOverlay);
        enemy1ImageOverlay.name = "enemy1-image-overlay";

        enemy1ImageOverlay.layout.copy(enemy1Image.layout);
        enemy1ImageOverlay.compositeOperation = "screen";
        enemy1ImageOverlay.copyStyle(item1ImageOverlay);

        const enemy2Image = new ImageElement();
        this.displayContent.add(enemy2Image);
        enemy2Image.name = "enemy2-image";

        enemy2Image.image = this.ctx.spriteSheet;

        enemy2Image.cutout.set({ x: 920, y: 877, width: 128, height: 128 });
        enemy2Image.layout.set({ x: 944, y: 592, z: zOffset + 1, width: 80, height: 80 });

        const enemy2ImageOverlay = new RectElement();
        this.displayContent.add(enemy2ImageOverlay);
        enemy2ImageOverlay.name = "enemy2-image-overlay";

        enemy2ImageOverlay.layout.copy(enemy2Image.layout);
        enemy2ImageOverlay.compositeOperation = "screen";
        enemy2ImageOverlay.copyStyle(item1ImageOverlay);

        const scoreBarLeft = new RectElement();
        this.displayContent.add(scoreBarLeft);
        scoreBarLeft.name = "score-bar-left";

        scoreBarLeft.layout.set({ x: 256, y: 742, z: zOffset + 1, width: 64, height: 4 });
        scoreBarLeft.color = Color.white;

        const scoreBarRight = new RectElement();
        this.displayContent.add(scoreBarRight);
        scoreBarRight.name = "score-bar-right";

        scoreBarRight.layout.set({ x: 960, y: 742, z: zOffset + 1, width: 64, height: 4 });
        scoreBarRight.color = Color.white;

        const highestScoreLabel = new TextElement();
        this.displayContent.add(highestScoreLabel);
        highestScoreLabel.name = "highest-score-label";

        highestScoreLabel.layout.set({ x: 336, y: 720, z: zOffset + 1, width: 608, height: 48 });
        highestScoreLabel.copyStyle(jumpLabel);
        highestScoreLabel.align = "center";

        this.background = background;
        this.header = helpHeader;
        this.headerBar = helpHeaderBar;
        this.jumpLabel = jumpLabel;
        this.jumpLabelBackground = jumpValueBackground;
        this.jumpLabelValue = jumpValueLabel;
        this.shootLabel = shootLabel;
        this.shootLabelBackground = shootValueBackground;
        this.shootLabelValue = shootValueLabel;
        this.collectItemsLabel = collectItemsLabel;
        this.item1Image = item1Image;
        this.item1ImageOverlay = item1ImageOverlay;
        this.item2Image = item2Image;
        this.item2ImageOverlay = item2ImageOverlay;
        this.destroyEnemiesLabel = destroyEnemiesLabel;
        this.enemy1Image = enemy1Image;
        this.enemy1ImageOverlay = enemy1ImageOverlay;
        this.enemy2Image = enemy2Image;
        this.enemy2ImageOverlay = enemy2ImageOverlay;
        this.scoreBarLeft = scoreBarLeft;
        this.scoreBarRight = scoreBarRight;
        this.highestScoreLabel = highestScoreLabel;
    }
}
