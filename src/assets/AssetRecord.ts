import { AssetType, ColorSpace } from "./assetTypes";

export interface TextureConfig {
    colorSpace: ColorSpace;
    flipY: boolean;
}

export interface AssetRecord {
    readonly id: string;
    readonly type: AssetType;
    readonly url: string;
}

export class ModelAssetRecord implements AssetRecord {
    public readonly id: string;
    public readonly type: AssetType;
    public readonly url: string;

    constructor(id: string, url: string) {
        this.id = id;
        this.url = url;
        this.type = AssetType.GLB;
    }
}

export class TextureAssetRecord implements AssetRecord {
    public readonly id: string;
    public readonly type: AssetType;
    public readonly url: string;

    public readonly colorSpace: ColorSpace;
    public readonly flipY: boolean;

    constructor(id: string, type: AssetType, url: string, config: TextureConfig) {
        this.id = id;
        this.type = type;
        this.url = url;

        this.colorSpace = config.colorSpace;
        this.flipY = config.flipY;
    }
}

export class AudioAssetRecord implements AssetRecord {
    public readonly id: string;
    public readonly type: AssetType;
    public readonly url: string;

    constructor(id: string, url: string) {
        this.id = id;
        this.url = url;
        this.type = AssetType.OGG;
    }
}
