import { BootScene }    from './scenes/BootScene.js';
import { MenuScene }    from './scenes/MenuScene.js';
import { DialogueScene } from './scenes/DialogueScene.js';
import { CombatScene }  from './scenes/CombatScene.js';
import { EndScene }     from './scenes/EndScene.js';
import {CoachScene}       from './scenes/CoachScene.js'; // Ojo aquí, no tiene llaves
import { TutorialScene } from './scenes/TutorialScene.js';

/* ---------------------------------------------
¿Qué hace?
Define la configuración global y los cimientos del motor Phaser 3 para que el juego pueda arrancar en el navegador.

¿Qué podemos cambiar (tamaños, espaciados, etc.)?
- width y height: La resolución base del juego.
- backgroundColor: El color de fondo por defecto (gris oscuro #242424) que se ve antes de que cargue el fondo de la pelea.
- debug: false -> Si lo cambias a true, verás las "cajas de colisión" (hitboxes) de color verde y rosa, ideal para hacer pruebas.

¿Qué controla?
Controla el renderizador (Phaser.AUTO elige WebGL o Canvas automáticamente), el motor de físicas (Arcade), el tamaño del "lienzo" (canvas) HTML y el registro de todas las escenas disponibles.

Importancia
CRÍTICA. Es el corazón del proyecto. Sin este archivo, el juego literalmente no existe y no se dibujará nada en la pantalla.
-------------------------------------------
*/
export const config = {
    type: Phaser.AUTO,
    width: 2170,
    height: 1160,
    parent: 'game',
    backgroundColor: '#242424',
    scale: {
        mode: Phaser.Scale.FIT, // Encoge o estira el juego manteniendo la proporción
        autoCenter: Phaser.Scale.CENTER_BOTH // Lo centra en medio de la pantalla
    },
    scene: [BootScene, MenuScene, CombatScene, DialogueScene, CoachScene, EndScene, TutorialScene]
};