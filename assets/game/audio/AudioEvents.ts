import { AudioChannel } from './AudioChannel';

export const AudioEvents = {
    Play: 'audio_play',
    Stop: 'audio_stop',
    StopChannel: 'audio_stop_channel',
    StopAll: 'audio_stop_all',
    SetVolume: 'audio_set_volume',
    AdjustVolume: 'audio_adjust_volume',
    SetMuted: 'audio_set_muted',
    SettingsChanged: 'audio_settings_changed',
} as const;

export type AudioEvent = typeof AudioEvents[keyof typeof AudioEvents];

export interface AudioPlayPayload {
    readonly id: string;
    readonly channel?: AudioChannel;
    readonly loop?: boolean;
    readonly volume?: number;
}

export interface AudioStopPayload {
    readonly id: string;
}

export interface AudioChannelPayload {
    readonly channel: AudioChannel;
}

export interface AudioSetVolumePayload {
    readonly channel: AudioChannel;
    readonly volume: number;
}

export interface AudioAdjustVolumePayload {
    readonly channel: AudioChannel;
    readonly delta: number;
}

export interface AudioMutePayload {
    readonly muted: boolean;
}

export interface AudioSettingsSnapshot {
    readonly musicVolume: number;
    readonly sfxVolume: number;
    readonly muted: boolean;
}
