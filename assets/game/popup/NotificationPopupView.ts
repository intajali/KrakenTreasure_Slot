import { _decorator, instantiate, Label, Node, Prefab, SpriteFrame } from 'cc';
import { BasePopup } from '../../core/architecture/BasePopup';
import { EventBus, SlotEvents } from '../../core/events/EventBus';
import { PopupButtonItemView } from './PopupButtonItemView';
const { ccclass, property } = _decorator;

export enum ButtonType {
    CONFIRM = 'confirm',
    CANCEL = 'cancel',
    CLOSE = 'close',
    YES = 'yes',
    NO = 'no',
    OK = 'ok',
    ADD = 'add',
    APPLY = 'apply',
}

export enum PopupType {
    NOTIFICATION = 'NOTIFICATION',
    PROMOTION = 'PROMOTION',
    REWARD = 'REWARD',
    ERROR = 'ERROR',
    SUCCESS = 'SUCCESS',
}

export interface PopupButtonItemData {
    title: string;
    buttonType: ButtonType;
    buttonSprite?: SpriteFrame;
}

export interface NotificationPopupData {
    header: PopupType | string;
    message: string;
    buttons?: PopupButtonItemData[];
}

@ccclass('NotificationPopupView')
export class NotificationPopupView extends BasePopup {
    @property(Prefab)
    private popupButtonItemPrefab: Prefab | null = null;

    @property(Node)
    private buttonItemsParent: Node | null = null;

    @property(Label)
    private popupHeader: Label | null = null;

    @property(Label)
    private popupMessage: Label | null = null;

    private generatedItems: Node[] = [];
    private readonly onButtonClicked = (_buttonType: ButtonType): void => {
        if (!this.node.active) {
            return;
        }
        this.close();
    };

    protected onInitialize(): void {
        this.resolveRefs();
        this.collectExistingItems();
        this.generatedItems.forEach(item => {
            item.active = false;
        });
        EventBus.on(SlotEvents.PopupButtonItemClicked, this.onButtonClicked);
        this.hide();
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.PopupButtonItemClicked, this.onButtonClicked);
        this.generatedItems.forEach(item => {
            item.getComponent(PopupButtonItemView)?.dispose();
        });
        this.generatedItems = [];
    }

    protected onOpen(data: NotificationPopupData): void {
        if (!data) {
            return;
        }

        super.onOpen(data);
        this.resolveRefs();

        if (this.popupHeader) {
            this.popupHeader.string = String(data.header ?? '');
        }
        if (this.popupMessage) {
            this.popupMessage.string = data.message ?? '';
        }

        const buttons = data.buttons?.length
            ? data.buttons
            : [{ title: 'OK', buttonType: ButtonType.OK }];

        buttons.forEach((buttonData, index) => {
            const itemNode = this.generateItems(index);
            if (!itemNode) {
                return;
            }
            itemNode.active = true;
            const itemView = itemNode.getComponent(PopupButtonItemView)
                ?? itemNode.addComponent(PopupButtonItemView);
            itemView.setData(buttonData, index);
        });

        for (let i = buttons.length; i < this.generatedItems.length; i++) {
            this.generatedItems[i].active = false;
        }
    }

    protected onClose(): void {
        this.generatedItems.forEach(item => {
            item.active = false;
        });
        if (this.popupHeader) {
            this.popupHeader.string = '';
        }
        if (this.popupMessage) {
            this.popupMessage.string = '';
        }
        super.onClose();
    }

    private generateItems(index: number): Node | null {
        if (index < this.generatedItems.length) {
            return this.generatedItems[index];
        }

        const parent = this.buttonItemsParent;
        if (!parent) {
            return null;
        }

        const templateNode = this.generatedItems[0];
        const itemNode = this.popupButtonItemPrefab
            ? instantiate(this.popupButtonItemPrefab)
            : templateNode
                ? instantiate(templateNode)
                : null;
        if (!itemNode) {
            return null;
        }
        itemNode.name = `ButtonItem_${index}`;
        itemNode.setParent(parent);
        itemNode.setScale(1, 1, 1);
        itemNode.active = true;
        this.generatedItems.push(itemNode);
        return itemNode;
    }

    private collectExistingItems(): void {
        if (!this.buttonItemsParent) {
            return;
        }
        this.generatedItems = this.buttonItemsParent.children.filter(child =>
            !!child.getComponent(PopupButtonItemView) || child.name.startsWith('ButtonItem'),
        );
    }

    private resolveRefs(): void {
        const popupRoot = this.node.getChildByName('Popup') ?? this.node;
        this.popupHeader = this.popupHeader
            ?? this.findLabelByNodeName(popupRoot, 'LabelHeader');
        this.popupMessage = this.popupMessage
            ?? this.findLabelByNodeName(popupRoot, 'MessageContext');
        this.buttonItemsParent = this.buttonItemsParent
            ?? this.findNodeByName(popupRoot, 'Container');
    }

    private findLabelByNodeName(root: Node, name: string): Label | null {
        const node = this.findNodeByName(root, name);
        return node?.getComponent(Label) ?? node?.getComponentInChildren(Label) ?? null;
    }

    private findNodeByName(root: Node, name: string): Node | null {
        if (root.name === name) {
            return root;
        }
        for (const child of root.children) {
            const match = this.findNodeByName(child, name);
            if (match) {
                return match;
            }
        }
        return null;
    }
}
