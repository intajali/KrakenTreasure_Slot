import { Component, Node } from 'cc';
import { IGamePanelController } from './IGamePanelController';

export class GamePanelResolver {
    public static resolve(root: Node | null): IGamePanelController | null {
        if (!root) {
            return null;
        }

        for (const component of root.getComponents(Component)) {
            if (this.isPanelController(component)) {
                return component;
            }
        }

        for (const child of root.children) {
            const match = this.resolve(child);
            if (match) {
                return match;
            }
        }

        return null;
    }

    public static isPanelController(value: unknown): value is IGamePanelController {
        const controller = value as Partial<IGamePanelController>;
        return typeof controller.getBalance === 'function'
            && typeof controller.getBetSelection === 'function'
            && typeof controller.canAffordSpin === 'function'
            && typeof controller.requestSpin === 'function'
            && typeof controller.startAutoSpin === 'function'
            && typeof controller.stopAutoSpin === 'function'
            && typeof controller.isAutoSpinActive === 'function'
            && typeof controller.increaseBet === 'function'
            && typeof controller.decreaseBet === 'function'
            && typeof controller.increaseMultiplier === 'function'
            && typeof controller.decreaseMultiplier === 'function'
            && typeof controller.setMaxAffordableBet === 'function'
            && typeof controller.canIncreaseBet === 'function'
            && typeof controller.canDecreaseBet === 'function'
            && typeof controller.canIncreaseMultiplier === 'function'
            && typeof controller.canDecreaseMultiplier === 'function';
    }
}
