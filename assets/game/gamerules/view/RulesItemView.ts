import { _decorator, Component, Label, Node } from 'cc';
import { BaseItemView } from 'db://assets/core/architecture/BaseItemView';
const { ccclass, property } = _decorator;

@ccclass('RulesItemView')
export class RulesItemView extends BaseItemView<string> {

    @property({ type: Label })
    public lbGameRules: Label | null = null;

    protected onSetData(data: string, index: number): void {
        this.lbGameRules.string = data;
        this.node.active = true;
       
    }
}

