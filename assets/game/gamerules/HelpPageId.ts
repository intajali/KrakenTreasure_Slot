export enum HelpPageId {
    Rules = 0,
    Paytables = 1,
    Paylines = 2,
    Settings = 3,
    TestMode = 4,
    Info = 5,
}

export type HelpPageSelectedHandler = (pageId: HelpPageId) => void;

const TOGGLE_NAME_TO_PAGE: Record<string, HelpPageId> = {
    ToggleRules: HelpPageId.Rules,
    TogglePaytables: HelpPageId.Paytables,
    TogglePaylines: HelpPageId.Paylines,
    ToggleSettings: HelpPageId.Settings,
    ToggleTestMode: HelpPageId.TestMode,
    ToggleInfo: HelpPageId.Info,
};

export function resolveHelpPageIdFromToggleName(toggleName: string): HelpPageId | null {
    return TOGGLE_NAME_TO_PAGE[toggleName] ?? null;
}
