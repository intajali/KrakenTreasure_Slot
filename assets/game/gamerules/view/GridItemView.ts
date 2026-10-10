import { BaseItemView } from "db://assets/core/architecture/BaseItemView";
import { _decorator, Node, Sprite } from "cc";
import { PaylineItemGridModel } from "../model/PaylineItemGridModel";
const { ccclass, property } = _decorator;

@ccclass('GridItemView')
export class GridItemView extends BaseItemView<PaylineItemGridModel> {

    @property({ type: Sprite })
    public gridBoxes: Sprite[] = [];


    protected onSetData(data: PaylineItemGridModel, index: number): void {

        //console.log('GridItemView onSetData', data.getGrid(), index);
        for (let i = 0; i < this.gridBoxes.length; i++) {
            this.gridBoxes[i].spriteFrame = data.getDefault();
        }
        this.gridBoxes[data.getGrid()].spriteFrame = data.getHighlight();
    }

    protected onDispose(): void {
        this.gridBoxes.forEach(gridBox => {
            gridBox.spriteFrame = null;
        });
    }
}