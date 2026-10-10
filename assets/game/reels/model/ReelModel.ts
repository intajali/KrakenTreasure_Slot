import { _decorator } from 'cc';
import { BaseReelModel } from 'db://assets/core/reel/base/BaseReelModel';
const { ccclass } = _decorator;

@ccclass('ReelModel')
export class ReelModel extends BaseReelModel {
    constructor(visibleRows = 3) {
        super();
        this.setVisibleRows(visibleRows);
    }
}

