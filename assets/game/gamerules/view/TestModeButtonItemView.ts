import { _decorator, Button, Label } from 'cc';
import { BaseItemView } from 'db://assets/core/architecture/BaseItemView';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { ButtonClickBounce } from '../../ui/ButtonClickBounce';
import { TestModeItemDataModel, TestModeItemType } from './TestModePanelView';
const { ccclass, property } = _decorator;

@ccclass('TestModeButtonItemView')
export class TestModeButtonItemView extends BaseItemView<TestModeItemDataModel> {
    @property({ type: Button })
    private button: Button | null = null;

    @property({ type: Label })
    private label: Label | null = null;

    protected onInitialize(): void {
        super.onInitialize();
        if (this.button) {
            ButtonClickBounce.ensure(this.button.node);
            this.button.node.on(Button.EventType.CLICK, this.onButtonClicked, this);
        }
    }

    protected onSetData(data: TestModeItemDataModel): void {
        if (this.label) {
            this.label.string = TestModeItemType[data.getItemType()];
        }
    }

    private onButtonClicked(): void {
        if (!this.data) {
            return;
        }
        EventBus.emit(SlotEvents.TestModeItemSelected, this.data);
    }

    protected onDispose(): void {
        this.button?.node.off(Button.EventType.CLICK, this.onButtonClicked, this);
    }
}
