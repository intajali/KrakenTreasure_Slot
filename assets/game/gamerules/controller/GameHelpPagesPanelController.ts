import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { BaseController } from 'db://assets/core/architecture/BaseController';
import { HelpPageId } from '../HelpPageId';
import { GameHelpPagesPanelView } from '../view/GameHelpPagesPanelView';

export class GameHelpPagesPanelController extends BaseController<GameHelpPagesPanelView> {
    private readonly onMenuButtonClicked = (): void => this.open(HelpPageId.Rules);

    protected onInitialize(): void {
        if (!this.view) {
            return;
        }

        this.view.setCloseHandler(() => this.close());
        this.view.setPageSelectedHandler(pageId => this.onHelpPageSelected(pageId));
        this.view.initialize();
        this.view.hide();

        EventBus.on(SlotEvents.MenuButtonClicked, this.onMenuButtonClicked);
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.MenuButtonClicked, this.onMenuButtonClicked);
        this.view?.setPageSelectedHandler(null);
        this.view?.setCloseHandler(null);
        this.view?.dispose();
    }

    public open(pageId: HelpPageId = HelpPageId.Rules): void {
        if (!this.view) {
            return;
        }

        if (!this.view.node.activeInHierarchy || !this.view.node.active) {
            this.view.show();
        }

        this.view.showHelpPage(pageId);
    }

    public close(): void {
        this.view?.hide();
    }

    private onHelpPageSelected(pageId: HelpPageId): void {
        this.view?.showHelpPage(pageId);
    }
}
