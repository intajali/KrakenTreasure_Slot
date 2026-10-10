import { BaseItemView } from "db://assets/core/architecture/BaseItemView";
import { _decorator, instantiate, Label ,Node, Sprite, SpriteFrame} from "cc";
import { GridItemView } from "./GridItemView";
import { PaylineItemGridModel } from "../model/PaylineItemGridModel";
const { ccclass, property } = _decorator;


@ccclass('PaylineItemView')
export class PaylineItemView extends BaseItemView<number[]> {

    @property({ type: Node })
    public gridParent: Node = null;

    @property({ type: Node })
    public grid: Node;

    @property({ type: Label })
    public lbIndex: Label;

    @property({type : SpriteFrame})
    public paylineOn: SpriteFrame | null = null;

    @property({type : SpriteFrame})
    public paylineOff: SpriteFrame | null = null;

    private generatedItems: Node[] = [];

    protected onSetData(data: number[], index: number): void {
       // console.log('PaylineItemView onSetData', data, index);
        this.lbIndex.string = index+'.';
        for (let i = 0; i < data.length; i++) { 
            const newGrid = this.generateItems(i);

            newGrid.active = true;
            newGrid.getComponent(GridItemView).setData(new PaylineItemGridModel(data[i],this.paylineOff ,this.paylineOn))

        }
    }

    generateItems(index: number): Node {

        if (index < this.generatedItems.length) {
            return this.generatedItems[index];
        } else {

            const itemNode = instantiate(this.grid);
            itemNode.setParent(this.gridParent); // Detach from any parent
            itemNode.setPosition(0, 0, 0);
            itemNode.setScale(1, 1, 1);

            this.generatedItems.push(itemNode);
            return itemNode;
        }
    }

    protected onDispose(): void {
        this.generatedItems = [];
    }
}