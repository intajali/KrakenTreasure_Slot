import { _decorator, Button, Sprite, Toggle } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { EventBus } from 'db://assets/core/events/EventBus';
    import { AudioController } from 'db://assets/game/audio/AudioController';
import { AudioChannel } from 'db://assets/game/audio/AudioChannel';
import { AUDIO_CONFIG } from 'db://assets/game/audio/AudioConfig'; 
import { AudioEvents, AudioSettingsSnapshot } from 'db://assets/game/audio/AudioEvents';
import { GAME_SPEED_CONFIG } from 'db://assets/game/settings/GameSpeedConfig';
import { GameSpeedController } from 'db://assets/game/settings/GameSpeedController';
import { GameSpeedEvents, GameSpeedSnapshot } from 'db://assets/game/settings/GameSpeedEvents';
import { ButtonClickBounce } from 'db://assets/game/ui/ButtonClickBounce';
const { ccclass, property } = _decorator;

@ccclass('GameSettingsPanelView')
export class GameSettingsPanelView extends BaseView {
    @property({ type: Button })
    private btnMusicVolumeUp: Button | null = null;

    @property({ type: Button })
    private btnMusicVolumeDown: Button | null = null;

    @property({ type: Sprite })
    private musicVolumeDisplayBar: Sprite | null = null;

    @property({ type: Button })
    private btnSFXVolumeUp: Button | null = null;

    @property({ type: Button })
    private btnSFXVolumeDown: Button | null = null;

    @property({ type: Sprite })
    private sfxVolumeDisplayBar: Sprite | null = null;

    @property({ type: Button })
    private btnSpeedUp: Button | null = null;

    @property({ type: Button })
    private btnSpeedDown: Button | null = null;

    @property({ type: Sprite })
    private speedDisplayBar: Sprite | null = null;

    @property({ type: Toggle, tooltip: 'Checked = muted.' })
    private muteToggle: Toggle | null = null;

    private syncingAudioUi = false;

    protected onInitialize(): void {
        this.bindButtons();
        EventBus.on(AudioEvents.SettingsChanged, this.onAudioSettingsChanged);
        EventBus.on(GameSpeedEvents.Changed, this.onGameSpeedChanged);
        this.refreshAudioUi(AudioController.getSettings());
        this.refreshSpeedUi(GameSpeedController.getSnapshot());
    }

    private bindButtons(): void {
        this.bindClick(this.btnMusicVolumeUp, this.onMusicVolumeUpClicked);
        this.bindClick(this.btnMusicVolumeDown, this.onMusicVolumeDownClicked);
        this.bindClick(this.btnSFXVolumeUp, this.onSFXVolumeUpClicked);
        this.bindClick(this.btnSFXVolumeDown, this.onSFXVolumeDownClicked);
        this.bindClick(this.btnSpeedUp, this.onSpeedUpClicked);
        this.bindClick(this.btnSpeedDown, this.onSpeedDownClicked);
        if (this.muteToggle) {
            ButtonClickBounce.ensure(this.muteToggle.node);
            this.muteToggle.node.on(Toggle.EventType.TOGGLE, this.onMuteToggleChanged, this);
        }
    }

    private bindClick(button: Button | null, handler: () => void): void {
        if (!button) {
            return;
        }
        ButtonClickBounce.ensure(button.node);
        button.node.on(Button.EventType.CLICK, handler, this);
    }

    private unbindButtons(): void {
        this.btnMusicVolumeUp?.node.off(Button.EventType.CLICK, this.onMusicVolumeUpClicked, this);
        this.btnMusicVolumeDown?.node.off(Button.EventType.CLICK, this.onMusicVolumeDownClicked, this);
        this.btnSFXVolumeUp?.node.off(Button.EventType.CLICK, this.onSFXVolumeUpClicked, this);
        this.btnSFXVolumeDown?.node.off(Button.EventType.CLICK, this.onSFXVolumeDownClicked, this);
        this.btnSpeedUp?.node.off(Button.EventType.CLICK, this.onSpeedUpClicked, this);
        this.btnSpeedDown?.node.off(Button.EventType.CLICK, this.onSpeedDownClicked, this);
        this.muteToggle?.node.off(Toggle.EventType.TOGGLE, this.onMuteToggleChanged, this);
    }

    private onMusicVolumeUpClicked(): void {
        this.adjustVolume(AudioChannel.Music, AUDIO_CONFIG.volumeStep);
    }

    private onMusicVolumeDownClicked(): void {
        this.adjustVolume(AudioChannel.Music, -AUDIO_CONFIG.volumeStep);
    }

    private onSFXVolumeUpClicked(): void {
        this.adjustVolume(AudioChannel.Sfx, AUDIO_CONFIG.volumeStep);
    }

    private onSFXVolumeDownClicked(): void {
        this.adjustVolume(AudioChannel.Sfx, -AUDIO_CONFIG.volumeStep);
    }

    private adjustVolume(channel: AudioChannel, delta: number): void {
        if (AudioController.getSettings().muted) {
            AudioController.setMuted(false);
        }
        AudioController.adjustVolume(channel, delta);
    }

    private onSpeedUpClicked(): void {
        if (!GameSpeedController.canChangeSpeed()) {
            return;
        }
        GameSpeedController.adjustSpeed(GAME_SPEED_CONFIG.step);
    }

    private onSpeedDownClicked(): void {
        if (!GameSpeedController.canChangeSpeed()) {
            return;
        }
        GameSpeedController.adjustSpeed(-GAME_SPEED_CONFIG.step);
    }

    private onMuteToggleChanged(toggle: Toggle): void {
        if (this.syncingAudioUi) {
            return;
        }
        AudioController.setMuted(toggle.isChecked);
    }

    private onAudioSettingsChanged = (settings: AudioSettingsSnapshot): void => {
        this.refreshAudioUi(settings);
    };

    private onGameSpeedChanged = (snapshot: GameSpeedSnapshot): void => {
        GameSpeedController.logReelSpeed('settings changed');
        this.refreshSpeedUi(snapshot);
    };

    private refreshAudioUi(settings: AudioSettingsSnapshot): void {
        this.syncingAudioUi = true;

        this.setFillBar(this.musicVolumeDisplayBar, settings.musicVolume);
        this.setFillBar(this.sfxVolumeDisplayBar, settings.sfxVolume);
        this.setButtonEnabled(this.btnMusicVolumeUp, settings.musicVolume < 1);
        this.setButtonEnabled(this.btnMusicVolumeDown, settings.musicVolume > 0);
        this.setButtonEnabled(this.btnSFXVolumeUp, settings.sfxVolume < 1);
        this.setButtonEnabled(this.btnSFXVolumeDown, settings.sfxVolume > 0);

        if (this.muteToggle) {
            this.muteToggle.isChecked = settings.muted;
        }

        this.syncingAudioUi = false;
    }

    private refreshSpeedUi(snapshot: GameSpeedSnapshot): void {
        const canChange = !snapshot.locked;
        this.setFillBar(this.speedDisplayBar, snapshot.speed);
        this.setButtonEnabled(this.btnSpeedUp, canChange && snapshot.speed < GAME_SPEED_CONFIG.max);
        this.setButtonEnabled(this.btnSpeedDown, canChange && snapshot.speed > GAME_SPEED_CONFIG.min);
    }

    private setFillBar(bar: Sprite | null, fill: number): void {
        if (!bar) {
            return;
        }
        bar.node.active = true;
        bar.fillRange = fill;
    }

    private setButtonEnabled(button: Button | null, enabled: boolean): void {
        if (button) {
            button.interactable = enabled;
        }
    }

    protected onDispose(): void {
        EventBus.off(AudioEvents.SettingsChanged, this.onAudioSettingsChanged);
        EventBus.off(GameSpeedEvents.Changed, this.onGameSpeedChanged);
        this.unbindButtons();
    }
}
