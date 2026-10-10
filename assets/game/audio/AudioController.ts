import { EventBus } from 'db://assets/core/events/EventBus';
import { AUDIO_CONFIG } from './AudioConfig';
import { AudioChannel } from './AudioChannel';
import {
    AudioAdjustVolumePayload,
    AudioChannelPayload,
    AudioEvents,
    AudioMutePayload,
    AudioPlayPayload,
    AudioSetVolumePayload,
    AudioSettingsSnapshot,
    AudioStopPayload,
} from './AudioEvents';

type AudioSettingsReader = () => AudioSettingsSnapshot;

/**
 * Fire-and-forget audio API. Gameplay should call this (or emit AudioEvents)
 * instead of holding an AudioManager reference.
 */
export class AudioController {
    private static settingsReader: AudioSettingsReader | null = null;

    public static bindSettingsReader(reader: AudioSettingsReader | null): void {
        this.settingsReader = reader;
    }

    public static play(id: string, options?: Omit<AudioPlayPayload, 'id'>): void {
        EventBus.emit<AudioPlayPayload>(AudioEvents.Play, { id, ...options });
    }

    public static stop(id: string): void {
        EventBus.emit<AudioStopPayload>(AudioEvents.Stop, { id });
    }

    public static stopChannel(channel: AudioChannel): void {
        EventBus.emit<AudioChannelPayload>(AudioEvents.StopChannel, { channel });
    }

    public static stopAll(): void {
        EventBus.emit(AudioEvents.StopAll);
    }

    public static playMusic(id: string, options?: Omit<AudioPlayPayload, 'id' | 'channel'>): void {
        this.play(id, { ...options, channel: AudioChannel.Music, loop: options?.loop ?? true });
    }

    public static playSfx(id: string, options?: Omit<AudioPlayPayload, 'id' | 'channel'>): void {
        this.play(id, { ...options, channel: AudioChannel.Sfx });
    }

    public static setVolume(channel: AudioChannel, volume: number): void {
        EventBus.emit<AudioSetVolumePayload>(AudioEvents.SetVolume, { channel, volume });
    }

    public static adjustVolume(channel: AudioChannel, delta: number): void {
        EventBus.emit<AudioAdjustVolumePayload>(AudioEvents.AdjustVolume, { channel, delta });
    }

    public static setMusicVolume(volume: number): void {
        this.setVolume(AudioChannel.Music, volume);
    }

    public static setSfxVolume(volume: number): void {
        this.setVolume(AudioChannel.Sfx, volume);
    }

    public static setMuted(muted: boolean): void {
        EventBus.emit<AudioMutePayload>(AudioEvents.SetMuted, { muted });
    }

    public static toggleMuted(): void {
        this.setMuted(!this.getSettings().muted);
    }

    public static getSettings(): AudioSettingsSnapshot {
        return this.settingsReader?.() ?? {
            musicVolume: AUDIO_CONFIG.defaultMusicVolume,
            sfxVolume: AUDIO_CONFIG.defaultSfxVolume,
            muted: false,
        };
    }
}
