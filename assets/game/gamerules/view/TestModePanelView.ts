import { _decorator, instantiate, Node, Prefab } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { BaseModel } from 'db://assets/core/architecture/BaseModel';
import { TestModeButtonItemView } from './TestModeButtonItemView';
const { ccclass, property } = _decorator;

export enum TestModeItemType {
    BASE_WIN = 0,
    WILD_WIN = 1,
    SCATTER_WIN = 2,
    BONUS_WIN = 3,
    TRIGGER_JACKPOT = 4,
    JACKPOT_MINI = 5,
    JACKPOT_MAXI = 6,
    JACKPOT_MEGA = 7,
    JACKPOT_GRAND = 8,
    JACKPOT_SIX_PEARLS = 9,
}

@ccclass('TestModeItemDataModel')
export class TestModeItemDataModel extends BaseModel {
    private itemType: TestModeItemType = TestModeItemType.BASE_WIN;

    public getItemType(): TestModeItemType {
        return this.itemType;
    }

    public setItemType(itemType: TestModeItemType): void {
        this.itemType = itemType;
    }

    public reset(): void {
        this.itemType = TestModeItemType.BASE_WIN;
    }
}

@ccclass('TestModePanelView')
export class TestModePanelView extends BaseView {
    @property({ type: Prefab })
    public itemPrefab: Prefab | null = null;

    @property({ type: Node })
    public contentParent: Node | null = null;

    private generatedItems: Node[] = [];

    protected onInitialize(): void {
        if (!this.itemPrefab || !this.contentParent) {
            console.warn('[TestModePanelView] itemPrefab or contentParent is not assigned.');
            return;
        }

        const itemTypes = Object.keys(TestModeItemType)
            .map(key => Number(key))
            .filter(value => !Number.isNaN(value));

        for (const itemType of itemTypes) {
            const itemNode = this.generateItems(itemType);
            const itemView = itemNode.getComponent(TestModeButtonItemView);
            if (!itemView) {
                continue;
            }

            const model = new TestModeItemDataModel();
            model.setItemType(itemType);
            itemView.setData(model);
        }
    }

    private generateItems(index: number): Node {
        if (index < this.generatedItems.length) {
            const existing = this.generatedItems[index];
            existing.active = true;
            return existing;
        }

        const itemNode = instantiate(this.itemPrefab!);
        itemNode.setParent(this.contentParent!);
        itemNode.setScale(1, 1, 1);
        itemNode.active = true;
        this.generatedItems.push(itemNode);
        return itemNode;
    }

    protected onDispose(): void {
        this.generatedItems.forEach(item => {
            item.getComponent(TestModeButtonItemView)?.dispose();
        });
        this.generatedItems = [];
    }
}
