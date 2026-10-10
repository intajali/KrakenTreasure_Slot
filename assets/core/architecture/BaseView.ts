import { Component } from 'cc';
import { ILifecycle } from '../interfaces/ILifecycle';

export abstract class BaseView extends Component implements ILifecycle {
    protected initialized = false;

    public initialize(): void {
        if (this.initialized) {
            return;
        }
        this.onInitialize();
        this.initialized = true;
    }

    protected onInitialize(): void {}

    public refresh(): void {}

    public show(): void {
        this.node.active = true;
    }

    public hide(): void {
        this.node.active = false;
    }

    public dispose(): void {
        if (!this.initialized) {
            return;
        }
        this.onDispose();
        this.initialized = false;
    }

    protected onDispose(): void {}
}


