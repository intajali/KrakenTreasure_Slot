import { _decorator } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';

const { ccclass } = _decorator;

/**
 * Base class for items instantiated at runtime into a ScrollView/Layout content node
 * (e.g. list rows, grid cells, reward items).
 *
 * T = the data shape this item renders.
 */
@ccclass('BaseItemView')
export abstract class BaseItemView<T = any> extends BaseView {

    protected data: T | null = null;
    protected index: number = -1;

    /**
     * Called by the parent/controller right after instantiation (and on reuse,
     * if you're pooling items). Stores the data and index, then delegates
     * to onSetData() for subclass-specific rendering.
     */
    public setData(data: T, index: number = -1): void {
        this.data = data;
        this.index = index;

        if (!this.initialized) {
            this.initialize();
        }

        this.onSetData(data, index);
    }

    public getData(): T | null {
        return this.data;
    }

    public getIndex(): number {
        return this.index;
    }

    /**
     * Subclasses implement this to bind data to their UI elements
     * (labels, sprites, buttons, etc).
     */
    protected abstract onSetData(data: T, index: number): void;

    protected onDispose(): void {
        this.data = null;
        this.index = -1;
    }
}