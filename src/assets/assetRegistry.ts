import { AssetType, ColorSpace } from "./assetTypes";
import { AssetRecord, AudioAssetRecord, ModelAssetRecord, TextureAssetRecord, TextureConfig } from "./AssetRecord";

const modelModules = import.meta.glob<string>("../../assets/models/*.glb", {
    query: "?inline",
    import: "default",
    eager: true,
});

const textureModules = import.meta.glob<string>("../../assets/textures/*.{jpg,exr,png}", {
    query: "?inline",
    import: "default",
    eager: true,
});

const audioModules = import.meta.glob<string>("../../assets/audio/**/*.ogg", {
    query: "?.inline",
    import: "default",
    eager: true,
});

const colorTextureConfig = { colorSpace: ColorSpace.SRGB, flipY: false, preloadImage: false };
const dataTextureConfig = { colorSpace: ColorSpace.NONE, flipY: false, preloadImage: false };
const environmentTextureConfig = { colorSpace: ColorSpace.SRGB, flipY: true, preloadImage: false };
const imageTextureConfig = { colorSpace: ColorSpace.NONE, flipY: false, preloadImage: true };

const textureConfigs: Record<string, TextureConfig> = {
    "/textures/arm_d": colorTextureConfig,
    "/textures/background": environmentTextureConfig,
    "/textures/pip_boy_display_d": colorTextureConfig,
    "/textures/pip_boy_display_e": colorTextureConfig,
    "/textures/pip_boy_main_d": colorTextureConfig,
    "/textures/pip_boy_parts_d": colorTextureConfig,
    "/textures/pip_boy_parts_e": colorTextureConfig,
    "/textures/pip_boy_secondary_d": colorTextureConfig,
    "/textures/thumb_up": colorTextureConfig,
    "/textures/game-anim": imageTextureConfig,
    "/textures/holotape-icon": imageTextureConfig,
    "/textures/minds-anim": imageTextureConfig,
    "/textures/minutemen-anim": imageTextureConfig,
    "/textures/patrol-anim": imageTextureConfig,
    "/textures/support-anim": imageTextureConfig,
    "/textures/thumb-up-anim": imageTextureConfig,
    "/textures/valentine-anim": imageTextureConfig,
    "/textures/wire-anim": imageTextureConfig,
};

function pathToId(path: string) {
    const assetsMarker = "/assets";
    const startIndex = path.indexOf(assetsMarker);
    const pathFromAssets = startIndex !== -1 ? path.slice(startIndex + assetsMarker.length) : path;
    const lastDotIndex = pathFromAssets.lastIndexOf(".");
    return lastDotIndex !== -1 ? pathFromAssets.substring(0, lastDotIndex) : pathFromAssets;
}

function createModelRecords() {
    const modelRecords: ModelAssetRecord[] = [];

    for (const entry of Object.entries(modelModules)) {
        const [filePath, dataUrl] = entry;
        modelRecords.push(new ModelAssetRecord(pathToId(filePath), dataUrl));
    }

    return modelRecords;
}

function createTextureRecords() {
    const textureRecords: TextureAssetRecord[] = [];

    for (const entry of Object.entries(textureModules)) {
        const [filePath, dataUrl] = entry;

        const id = pathToId(filePath);
        const ext = filePath.substring(filePath.lastIndexOf(".") + 1).toLowerCase();

        const typeDict = new Map<string, AssetType>([
            ["exr", AssetType.EXR],
            ["png", AssetType.PNG],
            ["jpg", AssetType.JPG],
        ]);

        const type = typeDict.get(ext);
        if (!type) {
            console.warn(`Unknown texture type "${ext}"`);
            continue;
        }

        const options = { dataTextureConfig, ...textureConfigs[id] };

        textureRecords.push(new TextureAssetRecord(id, type, dataUrl, options));
    }

    return textureRecords;
}

function createAudioRecords() {
    const audioRecords: AudioAssetRecord[] = [];

    for (const entry of Object.entries(audioModules)) {
        const [filePath, dataUrl] = entry;
        audioRecords.push(new AudioAssetRecord(pathToId(filePath), dataUrl));
    }

    return audioRecords;
}

export const assetRegistry: AssetRecord[] = [
    ...createModelRecords(),
    ...createTextureRecords(),
    ...createAudioRecords(),
];
