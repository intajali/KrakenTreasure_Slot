import { BaseController } from 'db://assets/core/architecture/BaseController';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { SlotDebugController } from '../../debug/SlotDebugController';
import { TestModeItemDataModel, TestModePanelView } from '../view/TestModePanelView';

export class TestModePanelController extends BaseController<TestModePanelView> {
    private readonly onItemSelected = (item: TestModeItemDataModel): void => {
        this.debugController.triggerScenarioByItemType(item.getItemType());
        this.onScenarioTriggered?.();
    };

    constructor(
        view: TestModePanelView,
        private readonly debugController: SlotDebugController,
        private readonly onScenarioTriggered?: () => void,
    ) {
        super(view);
    }

    protected onInitialize(): void {
        this.view?.initialize();
        EventBus.on(SlotEvents.TestModeItemSelected, this.onItemSelected);
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.TestModeItemSelected, this.onItemSelected);
        this.view?.dispose();
    }
}
