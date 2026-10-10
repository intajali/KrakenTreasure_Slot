import { ILifecycle } from '../interfaces/ILifecycle';

export abstract class BaseController<TView> implements ILifecycle {

    protected initialized = false;
    protected view: TView;

    constructor(view : TView) {
        this.view = view;
    }

    public initialize(): void {
        if (this.initialized) {
            return;
        }
        this.onInitialize();
        this.initialized = true;
    }

    protected onInitialize(): void {}

    public update(dt: number): void {}

    public dispose(): void {
        if (!this.initialized) {
            return;
        }
        this.onDispose();
        this.initialized = false;
    }

    protected onDispose(): void {}
}
