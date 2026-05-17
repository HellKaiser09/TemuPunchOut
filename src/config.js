import { BootScene }    from './scenes/BootScene.js';
import { MenuScene }    from './scenes/MenuScene.js';
import { DialogueScene } from './scenes/DialogueScene.js';
import { CombatScene }  from './scenes/CombatScene.js';
import { EndScene }     from './scenes/EndScene.js';
import  CoachScene       from './scenes/CoachScene.js';
import { TutorialScene } from './scenes/TutorialScene.js';
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
            debug: false
        }
    },
    scene: [BootScene, MenuScene, CombatScene, DialogueScene, CoachScene, EndScene,TutorialScene]
};






