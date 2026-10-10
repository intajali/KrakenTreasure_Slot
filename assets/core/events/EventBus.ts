type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus {
    private static listeners = new Map<string, Set<EventHandler>>();

    public static on<T = unknown>(event: string, handler: EventHandler<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler as EventHandler);
    }

    public static off<T = unknown>(event: string, handler: EventHandler<T>): void {
        this.listeners.get(event)?.delete(handler as EventHandler);
    }

    public static emit<T = unknown>(event: string, payload?: T): void {
        this.listeners.get(event)?.forEach(handler => handler(payload));
    }

    public static clear(event?: string): void {
        if (event) {
            this.listeners.delete(event);
            return;
        }
        this.listeners.clear();
    }
}

export const SlotEvents = {
    ClaimTreasure: 'claim_treasure',
    SpinRequested: 'spin_requested',
    SpinStarted: 'spin_started',
    ReelStopped: 'reel_stopped',
    AllReelsStopped: 'all_reels_stopped',
    WinEvaluated: 'win_evaluated',
    WinPresented: 'win_presented',
    WinLinePresented: 'win_line_presented',
    WinPresentationComplete: 'win_presentation_complete',
    FeatureTriggered: 'feature_triggered',
    FreeSpinStarted: 'free_spin_started',
    FreeSpinUpdated: 'free_spin_updated',
    FreeSpinEnded: 'free_spin_ended',
    AutoSpinStarted: 'auto_spin_started',
    AutoSpinUpdated: 'auto_spin_updated',
    AutoSpinEnded: 'auto_spin_ended',
    StateChanged: 'state_changed',
    BalanceUpdated: 'balance_updated',
    MenuButtonClicked: 'menu_button_clicked',
    TestModeItemSelected: 'testmode_item_selected',
    PopupButtonItemClicked: 'popup_button_item_clicked',
    ShowNotification: 'show_notification',
    
} as const;

export type SlotEvent = typeof SlotEvents[keyof typeof SlotEvents];
