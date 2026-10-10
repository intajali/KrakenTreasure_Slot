import { _decorator, Enum } from 'cc';
import { BaseItemView } from 'db://assets/core/architecture/BaseItemView';
import { HelpPageId } from '../HelpPageId';
const { ccclass, property } = _decorator;

@ccclass('MenuButtonItemView')
export class MenuButtonItemView extends BaseItemView<HelpPageId> {
    @property({
        type: Enum(HelpPageId),
        tooltip: 'Help page shown when this toggle is selected. None = resolve from node name.',
    })
    pageId: HelpPageId = HelpPageId.Rules;

    @property({ tooltip: 'When true, use the pageId property instead of the toggle node name.' })
    useExplicitPageId = false;

    protected onSetData(data: HelpPageId, _index: number): void {
        this.pageId = data;
        this.useExplicitPageId = true;
    }

    public resolvePageId(): HelpPageId {
        return this.pageId;
    }
}
