import symbolConfigData from 'db://assets/resources/symbols/SymbolConfig.json';

export interface SymbolConfig {
    id: number;
    name: string;
    symbol: string;
    weight: number;
    /** Sprite-atlas frame name (e.g. CHEST, A, R1). Falls back to the path folder name. */
    atlasFrameName?: string;
    /** SpriteAtlas resource path under assets/resources, without extension. */
    atlasResourcePath?: string;
    spriteFrameResourcePath?: string;
}

export const SYMBOL_CONFIG = symbolConfigData as readonly SymbolConfig[];

/** Default SpriteAtlas resources under assets/resources (no extension). */
export const SYMBOL_ATLAS_RESOURCE_PATHS = [
    'symbols/symbols',
    'symbols/jackpot',
] as const;

export function getSymbolAtlasFrameName(symbol: SymbolConfig): string | null {
    if (symbol.atlasFrameName) {
        return symbol.atlasFrameName;
    }

    const path = symbol.spriteFrameResourcePath;
    if (!path) {
        return null;
    }

    const parts = path.split('/').filter(Boolean);
    const last = parts[parts.length - 1] ?? '';
    if (last === 'spriteFrame' || last === 'sprite-frame') {
        return parts[parts.length - 2] ?? null;
    }

    return last.replace(/\.(png|jpg|jpeg|webp)$/i, '') || null;
}

export function getSymbolAtlasResourcePaths(): string[] {
    const paths = new Set<string>(SYMBOL_ATLAS_RESOURCE_PATHS);
    SYMBOL_CONFIG.forEach(symbol => {
        if (symbol.atlasResourcePath) {
            paths.add(symbol.atlasResourcePath);
        }
    });
    return [...paths];
}