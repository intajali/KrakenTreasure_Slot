import {
    _decorator,
    Color,
    Component,
    Graphics,
    Layers,
    Node,
    UITransform,
    Vec3,
    Widget,
} from 'cc';
import { IWinLine } from 'db://assets/core/slot/interfaces/ISpinResult';
const { ccclass, menu, property } = _decorator;

const OVERLAY_NAME = 'WinLineOverlay';
const SCATTER_LINE_INDEX = -1;
const BONUS_LINE_INDEX = -2;

/** Distinct stroke colors for the 15 configured paylines. */
const PAYLINE_COLORS: ReadonlyArray<Readonly<[number, number, number]>> = [
    [255, 64, 64],
    [64, 140, 255],
    [48, 220, 96],
    [255, 214, 64],
    [255, 72, 214],
    [64, 236, 236],
    [255, 148, 56],
    [176, 80, 255],
    [255, 255, 255],
    [255, 112, 160],
    [148, 255, 64],
    [64, 184, 255],
    [255, 196, 64],
    [64, 255, 184],
    [255, 96, 96],
];

const SCATTER_COLOR: Readonly<[number, number, number]> = [255, 214, 72];
const BONUS_COLOR: Readonly<[number, number, number]> = [72, 232, 255];

/**
 * Draws colored polylines through winning symbol centers.
 * Created at runtime on the reel root so it sits above symbols and inside the mask.
 */
@ccclass('WinLineRendererView')
@menu('Game/Paylines/Win Line Renderer')
export class WinLineRendererView extends Component {
    @property({ tooltip: 'Stroke width of the focused win line.' })
    lineWidth = 8;

    @property({ tooltip: 'Radius of the connector dots on each winning symbol.' })
    jointRadius = 9;

    private graphics: Graphics | null = null;
    private readonly localPoint = new Vec3();
    private readonly strokeColor = new Color();
    private readonly glowColor = new Color();
    private readonly fillColor = new Color();
    private readonly jointCoreColor = new Color(255, 255, 255, 255);

    public static findOn(parent: Node): WinLineRendererView | null {
        return parent.getChildByName(OVERLAY_NAME)?.getComponent(WinLineRendererView) ?? null;
    }

    public static ensureOn(parent: Node): WinLineRendererView {
        const existing = WinLineRendererView.findOn(parent);
        if (existing) {
            existing.bringToFront();
            return existing;
        }

        const node = new Node(OVERLAY_NAME);
        node.layer = Layers.Enum.UI_2D;
        parent.addChild(node);

        const transform = node.addComponent(UITransform);
        const parentTransform = parent.getComponent(UITransform);
        if (parentTransform) {
            transform.setContentSize(parentTransform.contentSize);
        }
        transform.setAnchorPoint(0.5, 0.5);

        const widget = node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.top = 0;
        widget.bottom = 0;
        widget.left = 0;
        widget.right = 0;
        widget.alignMode = Widget.AlignMode.ALWAYS;
        widget.updateAlignment();

        const renderer = node.addComponent(WinLineRendererView);
        renderer.bringToFront();
        return renderer;
    }

    protected onLoad(): void {
        this.graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
        this.graphics.lineCap = Graphics.LineCap.ROUND;
        this.graphics.lineJoin = Graphics.LineJoin.ROUND;
    }

    public showWinLines(
        winLines: readonly IWinLine[],
        resolveWorldPosition: (reel: number, row: number) => Vec3 | null,
    ): void {
        const graphics = this.ensureGraphics();
        graphics.clear();
        this.node.active = true;
        this.bringToFront();
        this.getComponent(Widget)?.updateAlignment();

        const focusedIndex = winLines.length - 1;
        winLines.forEach((line, index) => {
            this.drawWinLine(
                graphics,
                line,
                resolveWorldPosition,
                index === focusedIndex,
            );
        });
    }

    public clear(): void {
        this.graphics?.clear();
        this.node.active = false;
    }

    private drawWinLine(
        graphics: Graphics,
        line: IWinLine,
        resolveWorldPosition: (reel: number, row: number) => Vec3 | null,
        emphasized: boolean,
    ): void {
        const points = this.collectLocalPoints(line, resolveWorldPosition);
        if (points.length === 0) {
            return;
        }

        const rgb = this.getLineRgb(line.lineIndex);
        const alpha = emphasized ? 255 : 160;
        const width = emphasized ? this.lineWidth : this.lineWidth * 0.75;
        const jointRadius = emphasized ? this.jointRadius : this.jointRadius * 0.85;

        this.strokeColor.set(rgb[0], rgb[1], rgb[2], alpha);
        this.glowColor.set(rgb[0], rgb[1], rgb[2], Math.floor(alpha * 0.35));
        this.fillColor.set(rgb[0], rgb[1], rgb[2], alpha);

        if (points.length >= 2) {
            this.strokePolyline(graphics, points, width * 2.1, this.glowColor);
            this.strokePolyline(graphics, points, width, this.strokeColor);
        }

        points.forEach(point => {
            graphics.fillColor = this.fillColor;
            graphics.circle(point.x, point.y, jointRadius);
            graphics.fill();

            graphics.fillColor = this.jointCoreColor;
            graphics.circle(point.x, point.y, Math.max(2, jointRadius * 0.38));
            graphics.fill();
        });
    }

    private collectLocalPoints(
        line: IWinLine,
        resolveWorldPosition: (reel: number, row: number) => Vec3 | null,
    ): Vec3[] {
        const transform = this.node.getComponent(UITransform);
        if (!transform) {
            return [];
        }

        const points: Vec3[] = [];
        line.positions.forEach(position => {
            const world = resolveWorldPosition(position.reel, position.row);
            if (!world) {
                return;
            }

            transform.convertToNodeSpaceAR(world, this.localPoint);
            points.push(this.localPoint.clone());
        });

        return points;
    }

    private strokePolyline(
        graphics: Graphics,
        points: readonly Vec3[],
        width: number,
        color: Color,
    ): void {
        graphics.lineWidth = width;
        graphics.strokeColor = color;
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.stroke();
    }

    private getLineRgb(lineIndex: number): Readonly<[number, number, number]> {
        if (lineIndex === SCATTER_LINE_INDEX) {
            return SCATTER_COLOR;
        }
        if (lineIndex === BONUS_LINE_INDEX) {
            return BONUS_COLOR;
        }
        if (lineIndex < 0) {
            return PAYLINE_COLORS[0];
        }
        return PAYLINE_COLORS[lineIndex % PAYLINE_COLORS.length];
    }

    private ensureGraphics(): Graphics {
        if (!this.graphics) {
            this.graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
            this.graphics.lineCap = Graphics.LineCap.ROUND;
            this.graphics.lineJoin = Graphics.LineJoin.ROUND;
        }
        return this.graphics;
    }

    private bringToFront(): void {
        const parent = this.node.parent;
        if (!parent) {
            return;
        }
        this.node.setSiblingIndex(parent.children.length - 1);
    }
}
