import {
    _decorator,
    BlockInputEvents,
    Button,
    Color,
    Graphics,
    Label,
    Node,
    UITransform,
    Widget,
} from 'cc';
import { BasePopup } from 'db://assets/core/architecture/BasePopup';
import { EventBus } from 'db://assets/core/events/EventBus';
import { ButtonClickBounce } from '../../ui/ButtonClickBounce';
import { IGamePanelController } from '../../ui/IGamePanelController';
import { AUTO_SPIN_CONFIG, resolveAutoSpinCount } from '../config/AutoSpinConfig';
import { AutoSpinPanelEvents, AutoSpinSelection } from '../AutoSpinPanelEvents';
const { ccclass, property } = _decorator;

interface OptionButton {
    readonly value: number;
    readonly button: Button;
    readonly label: Label;
    readonly root: Node;
    readonly graphics: Graphics;
}

@ccclass('AutoSpinSelectionPanelView')
export class AutoSpinSelectionPanelView extends BasePopup {
    @property({ tooltip: 'Panel width in pixels.' })
    panelWidth = 420;

    @property({ tooltip: 'Panel height in pixels.' })
    panelHeight = 360;

    @property(Node)
    autoSpinCounterNode: Node | null = null;

    @property({ type: Label, tooltip: 'Spin count label.' })
    spinCountLabel: Label | null = null;

    private game: IGamePanelController | null = null;
    private selectedSpinCount = AUTO_SPIN_CONFIG.defaultSpinCount;
    private selectedLossLimit = AUTO_SPIN_CONFIG.defaultLossLimit;
    private built = false;

    private contentRoot: Node | null = null;
    private backdropNode: Node | null = null;
    private spinOptionButtons: OptionButton[] = [];
    private lossOptionButtons: OptionButton[] = [];
    private startButton: Button | null = null;
    private cancelButton: Button | null = null;
    private summaryLabel: Label | null = null;

    private readonly selectedFill = new Color(214, 168, 74, 255);
    private readonly idleFill = new Color(42, 70, 96, 230);
    private readonly panelFill = new Color(18, 32, 48, 245);
    private readonly backdropFill = new Color(0, 0, 0, 160);
    private readonly actionFill = new Color(214, 168, 74, 255);
    private readonly cancelFill = new Color(70, 88, 108, 255);

    protected onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        this.ensureUi();
        this.bindActions();
        this.refreshSelectionVisuals();
        this.refreshSummary();
    }

    protected onDispose(): void {
        this.unbindActions();
        this.game = null;
    }

    public setGame(game: IGamePanelController | null): void {
        this.game = game;
    }

    public openPanel(): void {
        this.node.active = true;
        this.ensureUi();
        if (this.contentRoot) {
            this.contentRoot.active = true;
            if (this.contentRoot.parent) {
                this.contentRoot.setSiblingIndex(this.contentRoot.parent.children.length - 1);
            }
        }
        if (this.node.parent) {
            this.node.setSiblingIndex(this.node.parent.children.length - 1);
        }

        this.node.getComponent(Widget)?.updateAlignment();
        this.contentRoot?.getComponent(Widget)?.updateAlignment();

        this.selectedSpinCount = AUTO_SPIN_CONFIG.defaultSpinCount;
        this.selectedLossLimit = AUTO_SPIN_CONFIG.defaultLossLimit;
        this.refreshSelectionVisuals();
        this.refreshSummary();
        this.open();
        EventBus.emit(AutoSpinPanelEvents.Opened, this.getSelection());
    }

    public closePanel(): void {
        this.close();
        EventBus.emit(AutoSpinPanelEvents.Closed, this.getSelection());
    }

    public getSelection(): AutoSpinSelection {
        return {
            spinCount: this.selectedSpinCount,
            lossLimit: this.selectedLossLimit,
        };
    }

    public hide(): void {
        this.ensureUi();
        if (this.contentRoot) {
            this.contentRoot.active = false;
            return;
        }
        // Never deactivate the host node — it may own unrelated scene UI (e.g. auto-spin counter).
    }

    public show(): void {
        this.ensureUi();
        if (this.contentRoot) {
            this.contentRoot.active = true;
            return;
        }
        // Host stays active; nothing else to show without a content root.
    }

    protected onOpen(_data?: unknown): void {
        const root = this.contentRoot ?? this.node;
        if (root.parent) {
            root.setSiblingIndex(root.parent.children.length - 1);
        }
        if (this.node.parent && this.contentRoot) {
            this.node.setSiblingIndex(this.node.parent.children.length - 1);
        }
    }

    private bindActions(): void {
        this.startButton?.node.on(Button.EventType.CLICK, this.onStartClicked, this);
        this.cancelButton?.node.on(Button.EventType.CLICK, this.onCancelClicked, this);
        this.backdropNode?.on(Node.EventType.TOUCH_END, this.onCancelClicked, this);

        this.spinOptionButtons.forEach(option => {
            option.button.node.on(Button.EventType.CLICK, () => this.selectSpinCount(option.value), this);
        });
        this.lossOptionButtons.forEach(option => {
            option.button.node.on(Button.EventType.CLICK, () => this.selectLossLimit(option.value), this);
        });
    }

    private unbindActions(): void {
        this.startButton?.node.off(Button.EventType.CLICK, this.onStartClicked, this);
        this.cancelButton?.node.off(Button.EventType.CLICK, this.onCancelClicked, this);
        this.backdropNode?.off(Node.EventType.TOUCH_END, this.onCancelClicked, this);
    }

    private onStartClicked = (): void => {
        if (!this.game) {
            return;
        }

        const spinCount = resolveAutoSpinCount(this.selectedSpinCount);
        const lossLimit = Math.max(0, this.selectedLossLimit);
        const selection = this.getSelection();

        this.closePanel();
        this.game.startAutoSpin(spinCount, lossLimit);
        EventBus.emit(AutoSpinPanelEvents.Started, selection);
    };

    private onCancelClicked = (): void => {
        this.closePanel();
    };

    private selectSpinCount(value: number): void {
        this.selectedSpinCount = value;
        this.refreshSelectionVisuals();
        this.refreshSummary();
    }

    private selectLossLimit(value: number): void {
        this.selectedLossLimit = value;
        this.refreshSelectionVisuals();
        this.refreshSummary();
    }

    private refreshSummary(): void {
        if (!this.summaryLabel) {
            return;
        }

        const spinsText = this.selectedSpinCount <= 0 ? '∞' : `${this.selectedSpinCount}`;
        const lossText = this.selectedLossLimit <= 0 ? 'None' : `${this.selectedLossLimit}`;
        this.summaryLabel.string = `Spins ${spinsText}  •  Loss limit ${lossText}`;
    }

    private refreshSelectionVisuals(): void {
        this.spinOptionButtons.forEach(option => {
            this.styleOption(option, option.value === this.selectedSpinCount);
        });
        this.lossOptionButtons.forEach(option => {
            this.styleOption(option, option.value === this.selectedLossLimit);
        });
    }

    private styleOption(option: OptionButton, selected: boolean): void {
        this.paintRoundedRect(option.graphics, 68, 40, selected ? this.selectedFill : this.idleFill);
        option.label.color = selected
            ? new Color(24, 28, 34, 255)
            : new Color(235, 242, 248, 255);
    }

    private ensureUi(): void {
        if (this.built) {
            return;
        }

        this.built = true;

        // Ensure host can participate in UI layout when created at runtime.
        if (!this.node.getComponent(UITransform)) {
            const hostTransform = this.node.addComponent(UITransform);
            hostTransform.setContentSize(1280, 720);
        }
        if (!this.node.getComponent(Widget)) {
            const hostWidget = this.node.addComponent(Widget);
            hostWidget.isAlignTop = true;
            hostWidget.isAlignBottom = true;
            hostWidget.isAlignLeft = true;
            hostWidget.isAlignRight = true;
            hostWidget.top = 0;
            hostWidget.bottom = 0;
            hostWidget.left = 0;
            hostWidget.right = 0;
            hostWidget.alignMode = Widget.AlignMode.ALWAYS;
            hostWidget.updateAlignment();
        }

        // Build under a dedicated child so hide()/BlockInput never disables a shared host
        // (e.g. FrontPanelView) that also owns credit/bet/spin UI.
        const root = new Node('AutoSpinSelectionContent');
        this.node.addChild(root);
        this.contentRoot = root;

        const rootTransform = root.addComponent(UITransform);
        rootTransform.setContentSize(1280, 720);

        const rootWidget = root.addComponent(Widget);
        rootWidget.isAlignTop = true;
        rootWidget.isAlignBottom = true;
        rootWidget.isAlignLeft = true;
        rootWidget.isAlignRight = true;
        rootWidget.top = 0;
        rootWidget.bottom = 0;
        rootWidget.left = 0;
        rootWidget.right = 0;
        rootWidget.alignMode = Widget.AlignMode.ALWAYS;
        rootWidget.updateAlignment();

        root.addComponent(BlockInputEvents);

        this.backdropNode = this.createFilledNode('Backdrop', root, 1280, 720, this.backdropFill);
        const backdropWidget = this.backdropNode.addComponent(Widget);
        backdropWidget.isAlignTop = true;
        backdropWidget.isAlignBottom = true;
        backdropWidget.isAlignLeft = true;
        backdropWidget.isAlignRight = true;
        backdropWidget.top = 0;
        backdropWidget.bottom = 0;
        backdropWidget.left = 0;
        backdropWidget.right = 0;

        const panelNode = this.createFilledNode('Panel', root, this.panelWidth, this.panelHeight, this.panelFill);
        panelNode.setPosition(0, 0, 0);

        this.createLabel('Title', panelNode, 'AUTO SPIN', 28, 0, 140, this.panelWidth - 40, 36);
        this.createLabel('SpinsHeader', panelNode, 'SPIN COUNT', 16, 0, 95, this.panelWidth - 40, 24);
        this.spinOptionButtons = this.createOptionRow(
            panelNode,
            AUTO_SPIN_CONFIG.spinCountOptions,
            45,
            value => (value <= 0 ? '∞' : `${value}`),
        );

        this.createLabel('LossHeader', panelNode, 'LOSS LIMIT', 16, 0, -5, this.panelWidth - 40, 24);
        this.lossOptionButtons = this.createOptionRow(
            panelNode,
            AUTO_SPIN_CONFIG.lossLimitOptions,
            -55,
            value => (value <= 0 ? 'None' : `${value}`),
        );

        this.summaryLabel = this.createLabel(
            'Summary',
            panelNode,
            '',
            15,
            0,
            -110,
            this.panelWidth - 40,
            24,
        );

        this.cancelButton = this.createActionButton(panelNode, 'CancelButton', 'CANCEL', -90, -150, 140, 44, this.cancelFill);
        this.startButton = this.createActionButton(panelNode, 'StartButton', 'START', 90, -150, 140, 44, this.actionFill);
    }

    private createOptionRow(
        parent: Node,
        values: readonly number[],
        y: number,
        format: (value: number) => string,
    ): OptionButton[] {
        const options: OptionButton[] = [];
        const gap = 12;
        const buttonWidth = 68;
        const totalWidth = values.length * buttonWidth + (values.length - 1) * gap;
        const startX = -totalWidth / 2 + buttonWidth / 2;

        values.forEach((value, index) => {
            const x = startX + index * (buttonWidth + gap);
            const root = this.createFilledNode(`Option_${value}`, parent, buttonWidth, 40, this.idleFill);
            root.setPosition(x, y, 0);
            const graphics = root.getComponent(Graphics)!;
            const label = this.createLabel('Label', root, format(value), 16, 0, 0, buttonWidth, 30);
            const button = root.addComponent(Button);
            button.transition = Button.Transition.NONE;
            ButtonClickBounce.ensure(root);
            options.push({ value, button, label, root, graphics });
        });

        return options;
    }

    private createActionButton(
        parent: Node,
        name: string,
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        fill: Color,
    ): Button {
        const root = this.createFilledNode(name, parent, width, height, fill);
        root.setPosition(x, y, 0);
        this.createLabel('Label', root, text, 18, 0, 0, width, height);
        const button = root.addComponent(Button);
        button.transition = Button.Transition.NONE;
        ButtonClickBounce.ensure(root);
        return button;
    }

    private createFilledNode(name: string, parent: Node, width: number, height: number, color: Color): Node {
        const node = new Node(name);
        parent.addChild(node);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(width, height);
        const graphics = node.addComponent(Graphics);
        this.paintRoundedRect(graphics, width, height, color);
        return node;
    }

    private paintRoundedRect(graphics: Graphics, width: number, height: number, color: Color): void {
        graphics.clear();
        graphics.fillColor = color;
        const radius = 10;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.fill();
    }

    private createLabel(
        name: string,
        parent: Node,
        text: string,
        fontSize: number,
        x: number,
        y: number,
        width: number,
        height: number,
    ): Label {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y, 0);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 4;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = new Color(240, 246, 252, 255);
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }
}
