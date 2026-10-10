import { Asset, resources } from 'cc';

export type ResourceAssetType<T extends Asset> = new (...args: never[]) => T;

export interface ResourceLoadEntry<TKey> {
    readonly key: TKey;
    readonly path: string;
}

export class ResourceLoader {
    public static load<T extends Asset>(
        path: string,
        assetType: ResourceAssetType<T>,
    ): Promise<T | null> {
        return new Promise(resolve => {
            resources.load(path, assetType, (error, asset) => {
                if (error) {
                    console.warn(`Failed to load resource asset: ${path}`, error);
                    resolve(null);
                    return;
                }

                resolve(asset ?? null);
            });
        });
    }

    public static async loadMap<TKey, TAsset extends Asset>(
        entries: readonly ResourceLoadEntry<TKey>[],
        assetType: ResourceAssetType<TAsset>,
    ): Promise<Map<TKey, TAsset>> {
        const loadedEntries = await Promise.all(
            entries.map(async entry => ({
                key: entry.key,
                asset: await this.load(entry.path, assetType),
            })),
        );
        const assets = new Map<TKey, TAsset>();

        loadedEntries.forEach(entry => {
            if (entry.asset) {
                assets.set(entry.key, entry.asset);
            }
        });

        return assets;
    }
}
