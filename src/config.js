import { BootScene } from './scenes/BootScene.js';
import { DialogueScene } from './scenes/DialogueScene.js';
import { CombatScene } from './scenes/CombatScene.js';
import { EndScene } from './scenes/EndScene.js';

export const config = {
    type: Phaser.AUTO,
    width: 2170,
    height: 1160,
    parent: 'game',
    backgroundColor: '#242424',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, 
            debug: true         
        }
    },
    scene: [BootScene, DialogueScene, CombatScene, EndScene]
};