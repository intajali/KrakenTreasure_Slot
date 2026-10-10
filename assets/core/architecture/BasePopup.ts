import { BaseView } from './BaseView';

export abstract class BasePopup extends BaseView {
    public open(data?: any): void {
        this.show();
        this.onOpen(data);
    }

    public close(): void {
        this.onClose();
        this.hide();
    }

    protected onOpen(_data?: any): void {}

    protected onClose(): void {}
}
