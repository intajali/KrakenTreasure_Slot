import { _decorator, AudioClip, AudioSource, Component, director, Enum, game, Game } from 'cc';
import { EventBus } from 'db://assets/core/events/EventBus';
import { AudioController } from './AudioController';
import { AudioChannel } from './AudioChannel';
import { AUDIO_CONFIG } from './AudioConfig';
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
import { AudioStorage } from './AudioStorage';
const { ccclass, menu, property } = _decorator;

@ccclass('AudioClipEntry')
export class AudioClipEntry {
    @property({ tooltip: 'Id used by Audio.play / AudioEvents.Play.' })
    id = '';

    @property({ type: AudioClip })
    clip: AudioClip | null = null;

    @property({ type: Enum(AudioChannel) })
    channel: AudioChannel = AudioChannel.Sfx;

    @property({ tooltip: 'When true, this clip loops until Audio.stop(id) or stopChannel.' })
    loop = false;

    @property({ range: [0, 1, 0.01], slide: true, tooltip: 'Per-clip gain, multiplied by channel volume.' })
    volume = 1;
}

/**
 * Audio engine component. GameBootstrap calls initialize(); gameplay talks to it
 * through AudioController / AudioEvents.
 */
@ccclass('AudioManager')
@menu('Game/Audio/Audio Manager')
export class AudioManager extends Component {
    @property({ type: [AudioClipEntry], tooltip: 'Register clips by id (bgm_main, sfx_spin, ...).' })
    clips: AudioClipEntry[] = [];

    @property({ tooltip: 'Optional music id to start automatically when initialize() runs.' })
    autoPlayMusicId = '';

    @property({ tooltip: 'Keep this node alive across scene changes.' })
    persistAcrossScenes = true;

    private static instance: AudioManager | null = null;
    private initialized = false;

    private readonly storage = new AudioStorage();
    private readonly clipById = new Map<string, AudioClipEntry>();
    private readonly loopSources = new Map<string, AudioSource>();
    private readonly missingIds = new Set<string>();

    private musicSource: AudioSource | null = null;
    private sfxSource: AudioSource | null = null;
    private musicVolume: number = AUDIO_CONFIG.defaultMusicVolume;
    private sfxVolume: number = AUDIO_CONFIG.defaultSfxVolume;
    private muted = false;
    private musicPausedByHide = false;
    private activeMusicId: string | null = null;

    public static getInstance(): AudioManager | null {
        return AudioManager.instance;
    }

    public initialize(): void {
        if (this.initialized) {
            return;
        }

        if (AudioManager.instance && AudioManager.instance !== this) {
            AudioManager.instance.dispose();
        }

        AudioManager.instance = this;
        this.buildClipMap();
        this.ensureSources();
        this.restoreSettings();
        this.bindEvents();
        AudioController.bindSettingsReader(() => this.snapshot());

        if (this.persistAcrossScenes) {
            director.addPersistRootNode(this.node);
        }

        this.initialized = true;

        if (this.autoPlayMusicId) {
            AudioController.playMusic(this.autoPlayMusicId);
        }
    }

    public dispose(): void {
        if (!this.initialized) {
            return;
        }

        this.unbindEvents();
        this.stopAll();
        AudioController.bindSettingsReader(null);
        if (AudioManager.instance === this) {
            AudioManager.instance = null;
        }
        this.initialized = false;
    }

    protected onDestroy(): void {
        this.dispose();
    }

    public getSettings(): AudioSettingsSnapshot {
        return this.snapshot();
    }

    private bindEvents(): void {
        EventBus.on(AudioEvents.Play, this.onPlay);
        EventBus.on(AudioEvents.Stop, this.onStop);
        EventBus.on(AudioEvents.StopChannel, this.onStopChannel);
        EventBus.on(AudioEvents.StopAll, this.onStopAll);
        EventBus.on(AudioEvents.SetVolume, this.onSetVolume);
        EventBus.on(AudioEvents.AdjustVolume, this.onAdjustVolume);
        EventBus.on(AudioEvents.SetMuted, this.onSetMuted);
        game.on(Game.EVENT_HIDE, this.onGameHide, this);
        game.on(Game.EVENT_SHOW, this.onGameShow, this);
    }

    private unbindEvents(): void {
        EventBus.off(AudioEvents.Play, this.onPlay);
        EventBus.off(AudioEvents.Stop, this.onStop);
        EventBus.off(AudioEvents.StopChannel, this.onStopChannel);
        EventBus.off(AudioEvents.StopAll, this.onStopAll);
        EventBus.off(AudioEvents.SetVolume, this.onSetVolume);
        EventBus.off(AudioEvents.AdjustVolume, this.onAdjustVolume);
        EventBus.off(AudioEvents.SetMuted, this.onSetMuted);
        game.off(Game.EVENT_HIDE, this.onGameHide, this);
        game.off(Game.EVENT_SHOW, this.onGameShow, this);
    }

    private onPlay = (payload: AudioPlayPayload): void => {
        if (!payload?.id) {
            return;
        }

        const entry = this.clipById.get(payload.id);
        if (!entry?.clip) {
            this.warnMissing(payload.id);
            return;
        }

        const channel = payload.channel ?? entry.channel;
        const loop = payload.loop ?? entry.loop;
        const clipVolume = payload.volume ?? entry.volume;

        if (channel === AudioChannel.Music) {
            this.playMusicClip(payload.id, entry.clip, loop, clipVolume);
            return;
        }

        if (loop) {
            this.playLoopingSfx(payload.id, entry.clip, clipVolume);
            return;
        }

        this.sfxSource?.playOneShot(entry.clip, this.clamp(clipVolume));
    };

    private onStop = (payload: AudioStopPayload): void => {
        if (!payload?.id) {
            return;
        }
        this.stopById(payload.id);
    };

    private onStopChannel = (payload: AudioChannelPayload): void => {
        if (payload?.channel === AudioChannel.Music) {
            this.stopMusic();
            return;
        }
        this.stopAllSfx();
    };

    private onStopAll = (): void => {
        this.stopAll();
    };

    private onSetVolume = (payload: AudioSetVolumePayload): void => {
        if (!payload) {
            return;
        }
        this.applyChannelVolume(payload.channel, payload.volume);
    };

    private onAdjustVolume = (payload: AudioAdjustVolumePayload): void => {
        if (!payload) {
            return;
        }
        const current = payload.channel === AudioChannel.Music ? this.musicVolume : this.sfxVolume;
        this.applyChannelVolume(payload.channel, current + payload.delta);
    };

    private onSetMuted = (payload: AudioMutePayload): void => {
        this.muted = !!payload?.muted;
        this.applyOutputVolumes();
        this.persistAndBroadcast();
    };

    private playMusicClip(id: string, clip: AudioClip, loop: boolean, clipVolume: number): void {
        if (!this.musicSource) {
            return;
        }

        this.musicSource.stop();
        this.musicSource.clip = clip;
        this.musicSource.loop = loop;
        this.musicSource.volume = this.outputVolume(this.musicVolume) * this.clamp(clipVolume);
        this.musicSource.play();
        this.activeMusicId = id;
        this.musicPausedByHide = false;
    }

    private playLoopingSfx(id: string, clip: AudioClip, clipVolume: number): void {
        let source = this.loopSources.get(id);
        if (!source) {
            source = this.node.addComponent(AudioSource);
            source.playOnAwake = false;
            this.loopSources.set(id, source);
        }

        source.stop();
        source.clip = clip;
        source.loop = true;
        source.volume = this.outputVolume(this.sfxVolume) * this.clamp(clipVolume);
        source.play();
    }

    private stopById(id: string): void {
        if (this.activeMusicId === id) {
            this.stopMusic();
        }

        const loopSource = this.loopSources.get(id);
        if (loopSource) {
            loopSource.stop();
        }
    }

    private stopMusic(): void {
        this.musicSource?.stop();
        this.activeMusicId = null;
        this.musicPausedByHide = false;
    }

    private stopAllSfx(): void {
        this.loopSources.forEach(source => source.stop());
        this.sfxSource?.stop();
    }

    private stopAll(): void {
        this.stopMusic();
        this.stopAllSfx();
    }

    private applyChannelVolume(channel: AudioChannel, volume: number): void {
        const clamped = this.clamp(volume);
        if (channel === AudioChannel.Music) {
            this.musicVolume = clamped;
        } else {
            this.sfxVolume = clamped;
        }
        this.applyOutputVolumes();
        this.persistAndBroadcast();
    }

    private applyOutputVolumes(): void {
        if (this.musicSource) {
            const clipGain = this.activeMusicId
                ? this.clipById.get(this.activeMusicId)?.volume ?? 1
                : 1;
            this.musicSource.volume = this.outputVolume(this.musicVolume) * clipGain;
        }
        if (this.sfxSource) {
            this.sfxSource.volume = this.outputVolume(this.sfxVolume);
        }
        this.loopSources.forEach((source, id) => {
            const clipGain = this.clipById.get(id)?.volume ?? 1;
            source.volume = this.outputVolume(this.sfxVolume) * clipGain;
        });
    }

    private outputVolume(channelVolume: number): number {
        return this.muted ? 0 : channelVolume;
    }

    private restoreSettings(): void {
        const saved = this.storage.load();
        this.musicVolume = saved?.musicVolume ?? AUDIO_CONFIG.defaultMusicVolume;
        this.sfxVolume = saved?.sfxVolume ?? AUDIO_CONFIG.defaultSfxVolume;
        this.muted = saved?.muted ?? false;
        this.applyOutputVolumes();
        EventBus.emit(AudioEvents.SettingsChanged, this.snapshot());
    }

    private persistAndBroadcast(): void {
        const snapshot = this.snapshot();
        this.storage.save(snapshot);
        EventBus.emit(AudioEvents.SettingsChanged, snapshot);
    }

    private snapshot(): AudioSettingsSnapshot {
        return {
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            muted: this.muted,
        };
    }

    private buildClipMap(): void {
        this.clipById.clear();
        this.clips.forEach(entry => {
            const id = entry.id?.trim();
            if (id && entry.clip) {
                this.clipById.set(id, entry);
            }
        });
    }

    private ensureSources(): void {
        this.musicSource = this.createSource();
        this.sfxSource = this.createSource();
    }

    private createSource(): AudioSource {
        const source = this.node.addComponent(AudioSource);
        source.playOnAwake = false;
        source.loop = false;
        source.volume = 1;
        return source;
    }

    private onGameHide = (): void => {
        if (this.activeMusicId && this.musicSource) {
            this.musicSource.pause();
            this.musicPausedByHide = true;
        }
    };

    private onGameShow = (): void => {
        if (this.musicPausedByHide) {
            this.musicSource?.play();
            this.musicPausedByHide = false;
        }
    };

    private warnMissing(id: string): void {
        if (this.missingIds.has(id)) {
            return;
        }
        this.missingIds.add(id);
        console.warn(`AudioManager: no clip registered for id "${id}"`);
    }

    private clamp(value: number): number {
        if (!Number.isFinite(value)) {
            return 0;
        }
        return Math.min(1, Math.max(0, value));
    }
}
