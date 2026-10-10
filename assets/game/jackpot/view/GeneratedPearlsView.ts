import { _decorator, instantiate, Node, Prefab } from 'cc';
import { BaseView } from '../../../core/architecture/BaseView';
import { JACKPOT_REEL_CONFIG } from '../config/JackpotReelConfig';
import { PearlRewardValues, PearlView } from './PearlView';
const { ccclass, property } = _decorator;

/**
 * Holds index/placement nodes and spawns PearlView prefabs under them
 * when a pearl lands on a jackpot reel.
 *
 * Visible rows match the reel window: 0 = upper, 1 = middle (center), 2 = lower.
 * Index nodes can be assigned in `positionSlots`, or are auto-collected
 * from this node's children (e.g. Node10..Node42) when the array is empty/null.
 * Flat index = reelIndex * rowCount + rowIndex.
 */
@ccclass('GeneratedPearlsView')
export class GeneratedPearlsView extends BaseView {
    @property({ type: Prefab, tooltip: 'PearlView prefab instantiated at landing slots.' })
    public pearlPrefab: Prefab | null = null;

    @property({
        type: [Node],
        tooltip: 'Index/parent nodes in order: reelIndex * rowCount + rowIndex. Falls back to children.',
    })
    public positionSlots: Node[] = [];

    @property({ tooltip: 'Number of reels (columns) in the position grid.' })
    public reelCount = JACKPOT_REEL_CONFIG.reelCount;

    @property({
        tooltip: 'Rows per reel column. If slots exceed reelCount * rowCount, rows are inferred.',
    })
    public rowCount = Math.max(1, JACKPOT_REEL_CONFIG.visibleRows);

    /** Flat list of valid index/parent nodes. */
    private indexNodes: Node[] = [];

    /** Placement nodes indexed as [reelIndex][rowIndex]. */
    private positionNodes: Array<Array<Node | null>> = [];

    /** Active pearl instances indexed as [reelIndex][rowIndex]. */
    private spawnedPearls: Array<Array<PearlView | null>> = [];

    protected onInitialize(): void {
        this.rebuildIndexGrid();
    }

    protected onDispose(): void {
        this.clearAllPearls();
        this.indexNodes = [];
        this.positionNodes = [];
        this.spawnedPearls = [];
    }

    /** Returns the index/parent node for a reel/row landing. */
    public getIndexNode(reelIndex: number, rowIndex: number): Node | null {
        this.ensureGridReady();
        return this.positionNodes[reelIndex]?.[rowIndex] ?? null;
    }

    public hasPearlAt(reelIndex: number, rowIndex: number): boolean {
        return !!this.spawnedPearls[reelIndex]?.[rowIndex]?.node?.isValid;
    }

    /**
     * Spawns at the reel's visible landing row (0=upper, 1=middle, 2=lower),
     * parents under that index node, and applies reward text.
     */
    public spawnPearlForReel(
        reelIndex: number,
        reward?: PearlRewardValues | null,
        visibleRowIndex: number = Math.floor(Math.max(1, this.rowCount) / 2),
    ): PearlView | null {
        this.ensureGridReady();

        if (reelIndex < 0 || reelIndex >= this.spawnedPearls.length) {
            console.warn(`[GeneratedPearlsView] Invalid reelIndex ${reelIndex}`);
            return null;
        }

        if (this.hasPearlAt(reelIndex, visibleRowIndex)) {
            return this.spawnedPearls[reelIndex][visibleRowIndex];
        }

        const pearl = this.spawnPearlAt(reelIndex, visibleRowIndex);
        if (pearl && reward) {
            pearl.setData(reward, reelIndex);
        }
        return pearl;
    }

    /**
     * Spawned pearls in reel-left-to-right, row-top-to-bottom order.
     * Used for the end-of-feature one-by-one reward tally.
     */
    public getSpawnedPearlsInOrder(): PearlView[] {
        this.ensureGridReady();
        const pearls: PearlView[] = [];

        for (let reelIndex = 0; reelIndex < this.spawnedPearls.length; reelIndex++) {
            const column = this.spawnedPearls[reelIndex];
            if (!column) {
                continue;
            }
            for (let rowIndex = 0; rowIndex < column.length; rowIndex++) {
                const pearl = column[rowIndex];
                if (pearl?.node?.isValid) {
                    pearls.push(pearl);
                }
            }
        }

        return pearls;
    }

    /**
     * Instantiates PearlView and parents it to the index node at [reel][row].
     */
    public spawnPearlAt(reelIndex: number, rowIndex: number): PearlView | null {
        this.ensureGridReady();

        if (!this.isInBounds(reelIndex, rowIndex)) {
            console.warn(`[GeneratedPearlsView] Out of bounds reel=${reelIndex} row=${rowIndex}`);
            return null;
        }

        if (!this.pearlPrefab) {
            console.warn('[GeneratedPearlsView] pearlPrefab is not assigned.');
            return null;
        }

        const indexNode = this.getIndexNode(reelIndex, rowIndex);
        if (!indexNode?.isValid) {
            console.warn(
                `[GeneratedPearlsView] Missing index node for reel=${reelIndex} row=${rowIndex}`,
            );
            return null;
        }

        this.clearPearlAt(reelIndex, rowIndex);

        const pearlNode = instantiate(this.pearlPrefab);
        pearlNode.name = `Pearl_r${reelIndex}_c${rowIndex}`;
        // Parent must be the index/slot node for this landing.
        pearlNode.setParent(indexNode);
        pearlNode.layer = indexNode.layer;
        pearlNode.setPosition(0, 0, 0);
        pearlNode.setScale(1, 1, 1);
        pearlNode.active = true;

        const pearlView = pearlNode.getComponent(PearlView) ?? pearlNode.addComponent(PearlView);
        this.spawnedPearls[reelIndex][rowIndex] = pearlView;
        return pearlView;
    }

    public clearPearlAt(reelIndex: number, rowIndex: number): void {
        if (!this.isInBounds(reelIndex, rowIndex)) {
            return;
        }

        const pearl = this.spawnedPearls[reelIndex][rowIndex];
        if (!pearl) {
            return;
        }

        if (pearl.node?.isValid) {
            pearl.node.destroy();
        }
        this.spawnedPearls[reelIndex][rowIndex] = null;
    }

    public clearAllPearls(): void {
        for (let reelIndex = 0; reelIndex < this.spawnedPearls.length; reelIndex++) {
            const column = this.spawnedPearls[reelIndex];
            if (!column) {
                continue;
            }
            for (let rowIndex = 0; rowIndex < column.length; rowIndex++) {
                this.clearPearlAt(reelIndex, rowIndex);
            }
        }
    }

    private ensureGridReady(): void {
        if (!this.initialized) {
            this.initialize();
            return;
        }

        if (this.indexNodes.length === 0 || this.spawnedPearls.length === 0) {
            this.rebuildIndexGrid();
        }
    }

    private rebuildIndexGrid(): void {
        this.indexNodes = this.resolveIndexNodes();
        const { reels, rows } = this.resolveGridSize(this.indexNodes.length);
        this.reelCount = reels;
        this.rowCount = rows;

        this.positionNodes = Array.from(
            { length: reels },
            () => Array.from({ length: rows }, () => null),
        );

        for (let reelIndex = 0; reelIndex < reels; reelIndex++) {
            for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
                const flatIndex = reelIndex * rows + rowIndex;
                this.positionNodes[reelIndex][rowIndex] = this.indexNodes[flatIndex] ?? null;
            }
        }

        this.spawnedPearls = Array.from(
            { length: reels },
            () => Array.from({ length: rows }, () => null),
        );
    }

    /** Prefer inspector slots; otherwise use child index nodes (Node10, Node11, ...). */
    private resolveIndexNodes(): Node[] {
        const assigned = (this.positionSlots ?? []).filter(
            (node): node is Node => !!node && node.isValid,
        );
        if (assigned.length > 0) {
            return assigned;
        }

        const children = [...this.node.children].filter(child => child?.isValid);
        children.sort((a, b) => this.compareIndexNodeNames(a.name, b.name));
        return children;
    }

    private compareIndexNodeNames(a: string, b: string): number {
        const parse = (name: string): [number, number] => {
            const match = /^Node(\d)(\d+)$/i.exec(name);
            if (!match) {
                return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
            }
            return [Number(match[1]), Number(match[2])];
        };

        const [reelA, rowA] = parse(a);
        const [reelB, rowB] = parse(b);
        if (reelA !== reelB) {
            return reelA - reelB;
        }
        return rowA - rowB;
    }

    private resolveGridSize(slotCount: number): { reels: number; rows: number } {
        const reels = Math.max(1, this.reelCount | 0);
        const configuredRows = Math.max(1, this.rowCount | 0);
        if (slotCount <= 0) {
            return { reels, rows: configuredRows };
        }

        const inferredRows = Math.max(1, Math.ceil(slotCount / reels));
        return { reels, rows: Math.max(configuredRows, inferredRows) };
    }

    private isInBounds(reelIndex: number, rowIndex: number): boolean {
        return reelIndex >= 0
            && rowIndex >= 0
            && reelIndex < this.spawnedPearls.length
            && rowIndex < (this.spawnedPearls[reelIndex]?.length ?? 0);
    }
}
