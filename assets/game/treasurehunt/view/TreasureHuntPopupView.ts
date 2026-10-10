import { _decorator, instantiate, Node, Prefab } from 'cc';
import { TreasureItemData, TreasureItemView } from './TreasureItemView';
import { BasePopup } from 'db://assets/core/architecture/BasePopup';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { TreasureHuntProgressEvents } from '../TreasureHuntProgressEvents';
const { ccclass, property } = _decorator;

@ccclass('TreasureHuntPopupView')
export class TreasureHuntPopupView extends BasePopup {
    @property(Prefab)
    itemPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: 'Content node for the treasure items.' })
    content: Node | null = null;

    private generatedItems: Node[] = [];
    private itemsById = new Map<string, TreasureItemView>();
    private hasClaimed = false;
    private readonly onClaimTreasureBound = (treasureId: string) => this.onClaimTreasure(treasureId);

    protected onInitialize(): void {
        EventBus.on(SlotEvents.ClaimTreasure, this.onClaimTreasureBound);
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.ClaimTreasure, this.onClaimTreasureBound);
        this.itemsById.clear();
    }

    protected onOpen(data: TreasureItemData[]): void {
        if (!this.content) {
            return;
        }

        this.hasClaimed = false;
        this.itemsById.clear();
        const items = data ?? [];

        for (let index = 0; index < items.length; index++) {
            const itemNode = this.generateItems(index);
            if (!itemNode) {
                continue;
            }
            itemNode.active = true;
            const itemView = itemNode.getComponent(TreasureItemView)
                ?? itemNode.addComponent(TreasureItemView);
            itemView?.setData(items[index], index);
            if (itemView) {
                this.itemsById.set(items[index].treasureId, itemView);
            }
        }

        for (let index = items.length; index < this.generatedItems.length; index++) {
            this.generatedItems[index].active = false;
        }
    }

    generateItems(index: number): Node | null {
        if (index < this.generatedItems.length) {
            return this.generatedItems[index];
        }

        if (!this.itemPrefab || !this.content) {
            return null;
        }

        const itemNode = instantiate(this.itemPrefab);
        itemNode.setParent(this.content);
        itemNode.setScale(1, 1, 1);
        this.generatedItems.push(itemNode);
        return itemNode;
    }

    private onClaimTreasure(treasureId: string): void {
        if (this.hasClaimed || !this.node.active) {
            return;
        }

        const itemView = this.itemsById.get(treasureId);
        const reward = itemView?.getData()?.reward;
        if (!itemView || !reward) {
            return;
        }

        this.hasClaimed = true;
        this.itemsById.forEach(item => item.setClaimEnabled(false));
        itemView.reveal();

        EventBus.emit(TreasureHuntProgressEvents.TreasureHuntAwarded, {
            treasureId,
            kind: reward.kind === 'freeSpins' ? 'freeSpins' : 'coins',
            coinAmount: reward.coinAmount,
            freeSpinCount: reward.freeSpinCount,
        });

        this.scheduleOnce(() => this.close(), 1.15);
    }

    protected onClose(): void {
        this.generatedItems.forEach(item => {
            item.active = false;
        });
        this.node.active = false;
    }

    protected onDestroy(): void {
        this.dispose();
    }
}
