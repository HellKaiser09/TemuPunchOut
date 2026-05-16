export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // this.add.image(W/2, H/2, 'bg_menu').setDisplaySize(W, H); // ← cuando tengas el asset
    this.add.rectangle(W/2, H/2, W, H, 0x111122); // placeholder
        // Opciones del menú
        const opciones = [
            { label: 'PLAY',      action: () => this.scene.start('DialogueScene', { lines: [], nextScene: 'CombatScene' }) },
            { label: 'CRÉDITOS', action: () => this._abrirCreditos() },
            { label: 'TUTORIAL', action: () => this.scene.start('TutorialScene') },
        ];

        opciones.forEach((op, i) => {
            this._menuItem(120, 370 + i * 130, op.label, op.action);
        });
    }

    

    _menuItem(x, y, label, onClick) {
    const W = 857;
    const H = 97;

    // Hover — mismo tamaño que el cartel, alineado desde x
    const hover = this.add.rectangle(x + W/2, y, W, H, 0xffffff, 0)
        .setOrigin(0.5);

    const texto = this.add.text(x + 20, y, label, {
        fontFamily: '"bowlby-one-sc", Impact, sans-serif',
        fontSize: '72px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
    }).setOrigin(0, 0.5);

    // Zona interactiva del mismo tamaño
    const zona = this.add.rectangle(x + W/2, y, W, H, 0xffffff, 0)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    zona.on('pointerover', () => {
        this.tweens.add({ targets: hover, fillAlpha: 1, duration: 100 });
        texto.setColor('#000000').setStroke('#000000', 2);
    });

    zona.on('pointerout', () => {
        this.tweens.add({ targets: hover, fillAlpha: 0, duration: 100 });
        texto.setColor('#ffffff').setStroke('#000000', 6);
    });

    zona.on('pointerdown', onClick);
}
    _abrirCreditos() {
        const W = this.scale.width;
        const H = this.scale.height;

        const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.7)
            .setInteractive();

        const panel = this.add.rectangle(W/2, H/2, 800, 500, 0x0d0d1a)
            .setStrokeStyle(4, 0xffffff);

        this.add.text(W/2, H/2 - 180, 'CRÉDITOS', {
            fontFamily: '"bowlby-one-sc", Impact, sans-serif',
            fontSize: '64px', color: '#ffffff',
        }).setOrigin(0.5);

        this.add.text(W/2, H/2, [
            'Diseño y dirección',
            'Arte y animación',
            'Programación',
            'Música y SFX',
            '',
            'Shock Therapy © 2025',
        ].join('\n'), {
            fontFamily: 'Arial, sans-serif',
            fontSize: '32px', color: '#cccccc',
            align: 'center', lineSpacing: 10,
        }).setOrigin(0.5);

        // Cerrar con click en overlay o botón
        const cerrarTexto = this.add.text(W/2, H/2 + 210, 'CERRAR', {
            fontFamily: '"bowlby-one-sc", Impact, sans-serif',
            fontSize: '48px', color: '#ffffff',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const destruir = () => {
            overlay.destroy(); panel.destroy(); cerrarTexto.destroy();
            tituloCreditos.destroy(); contenido.destroy();
        };

        const tituloCreditos = this.children.list.at(-4);
        const contenido      = this.children.list.at(-3);

        overlay.on('pointerdown', destruir);
        cerrarTexto.on('pointerdown', destruir);
        cerrarTexto.on('pointerover', () => cerrarTexto.setColor('#000000').setBackgroundColor('#ffffff'));
        cerrarTexto.on('pointerout',  () => cerrarTexto.setColor('#ffffff').setBackgroundColor(null));

        // Entrada animada
        panel.setScale(0.8).setAlpha(0);
        this.tweens.add({ targets: panel, scaleX: 1, scaleY: 1, alpha: 1, duration: 200, ease: 'Back.Out' });
    }
}