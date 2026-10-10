export const AutoSpinPanelEvents = {
    Opened: 'auto_spin_panel_opened',
    Closed: 'auto_spin_panel_closed',
    Started: 'auto_spin_panel_started',
} as const;

export type AutoSpinPanelEvent = typeof AutoSpinPanelEvents[keyof typeof AutoSpinPanelEvents];

export interface AutoSpinSelection {
    readonly spinCount: number;
    readonly lossLimit: number;
}
