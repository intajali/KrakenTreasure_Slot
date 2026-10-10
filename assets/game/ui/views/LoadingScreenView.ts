import { _decorator, Button, Label, Node, Sprite } from 'cc';
import { BaseView } from '../../../core/architecture/BaseView';
import { AudioController } from '../../audio/AudioController';
import { AudioIds } from '../../audio/AudioIds';
import { UiTween } from '../UiTween';
const { ccclass, property } = _decorator;

const LOADING_STEPS = [
    'Loading...',
    'Loading...',
    'Preparing game...',
    'Preparing game...',
    'Ready!',
];

@ccclass('LoadingScreenView')
export class LoadingScreenView extends BaseView {
    @property(Label)
    private loadingLabel: Label | null = null;

    @property({ type: Sprite, tooltip: 'Filled sprite that grows left to right.' })
    private fillBar: Sprite | null = null;

    @property(Node)
    private loadingBarRoot: Node | null = null;

    @property(Button)
    private startButton: Button | null = null;

    @property({ tooltip: 'Number of loading steps before the start button appears.' })
    private stepCount = 5;

    @property({ tooltip: 'Seconds each step holds while the bar fills toward that step.' })
    private stepDuration = 0.45;

    private currentStep = 0;
    private stepElapsed = 0;
    private displayProgress = 0;
    private isComplete = false;

    protected onLoad(): void {
        this.initialize();
    }

    protected onInitialize(): void {
        this.prepareFillBar();
        this.resetLoadingState();
        this.startButton?.node.on(Button.EventType.CLICK, this.onStartButtonClick, this);
    }

    public refresh(): void {
        this.resetLoadingState();
    }

    protected update(dt: number): void {
        if (!this.initialized || this.isComplete) {
            return;
        }

        this.stepElapsed += dt;
        if (this.currentStep < this.getStepCount() && this.stepElapsed >= this.stepDuration) {
            this.stepElapsed = 0;
            this.currentStep += 1;
            this.setLoadingText(this.getStepLabel(this.currentStep));
        }

        const target = this.currentStep / this.getStepCount();
        const fillSpeed = 1 / Math.max(0.05, this.stepDuration * this.getStepCount());
        this.displayProgress = Math.min(target, this.displayProgress + dt * fillSpeed);
        this.applyProgress(this.displayProgress);

        if (this.currentStep >= this.getStepCount() && this.displayProgress >= 0.999) {
            this.onLoadingComplete();
        }
    }

    protected onDispose(): void {
        UiTween.stop(this.startButton?.node);
        this.startButton?.node.off(Button.EventType.CLICK, this.onStartButtonClick, this);
    }

    public setLoadingProgress(progress: number): void {
        this.displayProgress = Math.min(1, Math.max(0, progress));
        this.applyProgress(this.displayProgress);
    }

    public setLoadingText(text: string): void {
        if (this.loadingLabel) {
            this.loadingLabel.string = text;
        }
    }

    public showStartButton(buttonActive: boolean): void {
        if (!this.startButton) {
            return;
        }
        this.startButton.node.active = buttonActive;
        this.startButton.interactable = buttonActive;
        this.startButton.enabled = buttonActive;
    }

    private resetLoadingState(): void {
        this.currentStep = 0;
        this.stepElapsed = 0;
        this.displayProgress = 0;
        this.isComplete = false;
        this.applyProgress(0);
        this.setLoadingText(this.getStepLabel(0));
        this.setLoadingUiVisible(true);
        this.showStartButton(false);
    }

    private onLoadingComplete(): void {
        this.isComplete = true;
        this.applyProgress(1);
        this.setLoadingUiVisible(false);
        this.showStartButton(true);
        UiTween.pulse(this.startButton?.node, { peakScale: 1.1, upDuration: 0.25, downDuration: 0.25, pause: 0.25 });
    }

    private onStartButtonClick(): void {
        UiTween.stop(this.startButton?.node);
        AudioController.playSfx(AudioIds.UiClick);
        AudioController.playMusic(AudioIds.BgmMain);
        this.hide();
    }

    private applyProgress(progress: number): void {
        if (!this.fillBar) {
            return;
        }
        this.fillBar.fillRange = Math.min(1, Math.max(0, progress));
    }

    private prepareFillBar(): void {
        if (!this.fillBar) {
            return;
        }
        this.fillBar.type = Sprite.Type.FILLED;
        this.fillBar.fillType = Sprite.FillType.HORIZONTAL;
        this.fillBar.fillStart = 0;
        this.fillBar.fillRange = 0;
    }

    private setLoadingUiVisible(visible: boolean): void {
        const barRoot = this.fillBar?.node.parent ?? this.fillBar?.node;
        if (barRoot) {
            barRoot.active = visible;
        }
        if (this.loadingLabel?.node) {
            this.loadingLabel.node.active = visible;
        }
        if (this.loadingBarRoot) {
           this.loadingBarRoot.active = visible;
        }
    }

    private getStepCount(): number {
        return Math.max(1, this.stepCount);
    }

    private getStepLabel(step: number): string {
        const index = Math.min(Math.max(0, step), LOADING_STEPS.length - 1);
        return LOADING_STEPS[index];
    }
}
