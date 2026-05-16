const gameConfig = {
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
            enableBody: true
        }
    },
    scene: [BootScene, DialogueScene, CombatScene, EndScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        fullscreenTarget: 'parent'
    }
};
 
// Exportar para que main.js lo use
window.gameConfig = gameConfig;