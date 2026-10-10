import { ILifecycle } from '../interfaces/ILifecycle';

export abstract class BaseManager implements ILifecycle {
    protected initialized = false;

    public initialize(): void {
        if (this.initialized) {
            return;
        }
        this.onInitialize();
        this.initialized = true;
    }

    protected onInitialize(): void {}

    public dispose(): void {
        if (!this.initialized) {
            return;
        }
        this.onDispose();
        this.initialized = false;
    }

    protected onDispose(): void {}
}
