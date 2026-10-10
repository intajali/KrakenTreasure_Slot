import { Component, _decorator } from 'cc';
import { ILifecycle } from '../interfaces/ILifecycle';

const { ccclass } = _decorator;

@ccclass('BaseApplication')
export abstract class BaseApplication extends Component implements ILifecycle {
    protected initialized = false;

    public initialize(): void {
        if (this.initialized) {
            return;
        }
        this.onInitialize();
        this.initialized = true;
    }

    protected abstract onInitialize(): void;

    protected onDestroy(): void {
        this.dispose();
    }

    public dispose(): void {
        if (!this.initialized) {
            return;
        }
        this.onDispose();
        this.initialized = false;
    }

    protected abstract onDispose(): void;
}
