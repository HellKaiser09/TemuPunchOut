// CoachScene.js
// Escena overlay entre rounds — muestra el coach y permite elegir un buff
// Se lanza encima de CombatScene sin detenerla: scene.launch('CoachScene')

import { BUFF_CATALOG } from '../systems/BuffSystem.js';

const COLORS = {
  bg:         0x1a1a2e,
  panel:      0x16213e,
  border:     0x0f3460,
  self:       0x1d9e75,
  enemy:      0xd85a30,
  mixed:      0x378add,
  selfBg:     0x0d4a35,
  enemyBg:    0x6b2d18,
  mixedBg:    0x1c3d5a,
  text:       0xf0ede6,
  textMuted:  0x8a8a9a,
  highlight:  0xffd700,
  hp:         0x1d9e75,
  energy:     0x378add,
  cardHover:  0x253050,
};

export default class CoachScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CoachScene' });
  }

  // roundData: { round, playerHp, playerMaxHp, playerEnergy }
  init(roundData) {
    this.roundData   = roundData;
    this.selectedId  = null;
    this.cards       = [];
    this.confirmBtn  = null;
  }

  create() {
    const { width, height } = this.scale;

    this._drawBackground(width, height);
    this._drawRoundHeader(width);
    this._drawStatBars(width);
    this._drawCoachBubble(width);
    this._drawBuffCards(width, height);
    this._drawConfirmButton(width, height);

    // Entrada animada
    this.cameras.main.setAlpha(0);
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 300 });
  }

  // ── UI helpers ──────────────────────────────────────────

  _drawBackground(w, h) {
    // Overlay semitransparente sobre la escena de combate
    this.add.rectangle(0, 0, w, h, 0x000000, 0.7).setOrigin(0);

    // Panel central
    const panelW = Math.min(w - 40, 520);
    const panelX = (w - panelW) / 2;
    const panelH = h - 60;

    this.panel = this.add.rectangle(panelX, 30, panelW, panelH, COLORS.panel)
      .setOrigin(0)
      .setStrokeStyle(1, COLORS.border);

    this.cx     = w / 2;
    this.panelX = panelX;
    this.panelW = panelW;
  }

  _drawRoundHeader(w) {
    const round = this.roundData?.round ?? 1;

    this.add.text(this.cx, 55, `ENTRE ROUNDS — ROUND ${round}`, {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#' + COLORS.textMuted.toString(16), letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(this.cx, 78, 'Sesión con el Coach', {
      fontSize: '22px', fontFamily: 'sans-serif', fontStyle: 'bold',
      color: '#' + COLORS.text.toString(16),
    }).setOrigin(0.5);
  }

  _drawStatBars(w) {
    const { playerHp = 65, playerMaxHp = 100, playerEnergy = 40 } = this.roundData ?? {};
    const barW  = this.panelW / 2 - 30;
    const baseX = this.panelX + 20;
    const y     = 115;

    this._bar('Vida',    baseX,            y, barW, playerHp / playerMaxHp, COLORS.hp);
    this._bar('Energía', baseX + barW + 20, y, barW, playerEnergy / 100,     COLORS.energy);
  }

  _bar(label, x, y, w, pct, color) {
    this.add.text(x, y, label, {
      fontSize: '11px', fontFamily: 'sans-serif',
      color: '#' + COLORS.textMuted.toString(16),
    });

    const pctText = Math.round(pct * 100) + '%';
    this.add.text(x + w, y, pctText, {
      fontSize: '11px', fontFamily: 'sans-serif',
      color: '#' + COLORS.text.toString(16),
    }).setOrigin(1, 0);

    // Track
    this.add.rectangle(x, y + 16, w, 7, 0x2a2a3e).setOrigin(0);
    // Fill
    this.add.rectangle(x, y + 16, Math.round(w * pct), 7, color).setOrigin(0);
  }

  _drawCoachBubble(w) {
    const bx = this.panelX + 16;
    const by = 155;
    const bw = this.panelW - 32;

    // Fondo burbuja
    this.add.rectangle(bx, by, bw, 58, 0x0d1a30).setOrigin(0)
      .setStrokeStyle(0.5, COLORS.border);

    this.add.text(bx + 14, by + 14, 'COACH', { fontSize: '24px' });

    // Texto — se actualiza al seleccionar
    this.coachText = this.add.text(bx + 50, by + 10,
      'Dr. Proyectado: "¿Te vas a dejar vencer?  Escucha mi consejo..."',
      {
        fontSize: '12px', fontFamily: 'sans-serif',
        color: '#' + COLORS.textMuted.toString(16),
        wordWrap: { width: bw - 65 },
      }
    );
  }

  _drawBuffCards(w, h) {
    const buffIds = Object.keys(BUFF_CATALOG);
    const cols    = 2;
    const cardW   = (this.panelW - 48) / cols;
    const cardH   = 115;
    const startX  = this.panelX + 16;
    const startY  = 232;
    const gapX    = 16;
    const gapY    = 12;

    this.add.text(startX, startY - 18, 'ELIGE UN CONSEJO', {
      fontSize: '10px', fontFamily: 'monospace',
      color: '#' + COLORS.textMuted.toString(16), letterSpacing: 1,
    });

    buffIds.forEach((id, i) => {
      const buff = BUFF_CATALOG[id];
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const cx   = startX + col * (cardW + gapX);
      const cy   = startY + row * (cardH + gapY);

      const card = this._buildCard(buff, cx, cy, cardW, cardH);
      this.cards.push({ id, card, buff, x: cx, y: cy, w: cardW, h: cardH });
    });
  }

  _buildCard(buff, x, y, w, h) {
    const borderColor = buff.type === 'self'  ? COLORS.self  :
                        buff.type === 'enemy' ? COLORS.enemy : COLORS.mixed;
    const bgColor     = buff.type === 'self'  ? COLORS.selfBg  :
                        buff.type === 'enemy' ? COLORS.enemyBg : COLORS.mixedBg;

    const bg = this.add.rectangle(x, y, w, h, bgColor).setOrigin(0)
      .setStrokeStyle(1, borderColor)
      .setInteractive({ useHandCursor: true });

    // Tag
    const tagColor = buff.type === 'self' ? '#1d9e75' : buff.type === 'enemy' ? '#d85a30' : '#378add';
    this.add.text(x + 10, y + 8, buff.tag.toUpperCase(), {
      fontSize: '9px', fontFamily: 'monospace',
      color: tagColor, letterSpacing: 1,
    });

    // Icono + nombre
    this.add.text(x + 10, y + 24, buff.icon, { fontSize: '20px' });
    this.add.text(x + 38, y + 26, buff.name, {
      fontSize: '13px', fontFamily: 'sans-serif', fontStyle: 'bold',
      color: '#' + COLORS.text.toString(16),
    });

    // Descripción
    this.add.text(x + 10, y + 50, buff.desc, {
      fontSize: '11px', fontFamily: 'sans-serif',
      color: '#' + COLORS.textMuted.toString(16),
      wordWrap: { width: w - 20 },
    });

    // Stat
    this.add.text(x + 10, y + h - 20, buff.statLabel, {
      fontSize: '10px', fontFamily: 'monospace',
      color: tagColor,
    });

    // Hover
    bg.on('pointerover',  () => { if (this.selectedId !== buff.id) bg.setFillStyle(COLORS.cardHover); });
    bg.on('pointerout',   () => { if (this.selectedId !== buff.id) bg.setFillStyle(bgColor); });
    bg.on('pointerdown',  () => this._selectBuff(buff.id));

    return { bg, bgColor, borderColor };
  }

  _selectBuff(id) {
    this.selectedId = id;

    // Resetea todos los cards
    this.cards.forEach(({ id: cid, card, buff }) => {
      const isSelected = cid === id;
      const borderColor = isSelected ? COLORS.highlight : card.borderColor;
      const alpha       = isSelected ? 1 : 0.55;
      card.bg.setStrokeStyle(isSelected ? 2 : 1, borderColor).setAlpha(alpha);
    });

    // Actualiza quote del coach
    const buff = BUFF_CATALOG[id];
    this.coachText.setText(`Dr. Proyectado: "${buff.coachQuote}"`);

    // Activa botón
    if (this.confirmBtn) {
      this.confirmBtn.setAlpha(1).setInteractive({ useHandCursor: true });
      this.confirmBtnText.setAlpha(1);
    }
  }

  _drawConfirmButton(w, h) {
    const bw = this.panelW - 32;
    const bx = this.panelX + 16;
    const by = h - 65;

    this.confirmBtn = this.add.rectangle(bx, by, bw, 42, 0x2a2a3e)
      .setOrigin(0)
      .setStrokeStyle(1, COLORS.border)
      .setAlpha(0.4);   // desactivado hasta que se seleccione

    this.confirmBtnText = this.add.text(bx + bw / 2, by + 21,
      'Aplicar consejo al round →',
      {
        fontSize: '14px', fontFamily: 'sans-serif', fontStyle: 'bold',
        color: '#' + COLORS.text.toString(16),
      }
    ).setOrigin(0.5).setAlpha(0.4);

    this.confirmBtn.on('pointerdown', () => this._confirm());
    this.confirmBtn.on('pointerover', () => {
      if (this.selectedId) this.confirmBtn.setFillStyle(COLORS.cardHover);
    });
    this.confirmBtn.on('pointerout', () => {
      if (this.selectedId) this.confirmBtn.setFillStyle(0x2a2a3e);
    });
  }

  _confirm() {
    if (!this.selectedId) return;

    // Fade out y devuelve control con el buff seleccionado
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        this.registry.set('pendingBuff', this.selectedId);

        // Emite evento global para que CombatScene lo aplique
        this.scene.get('CombatScene').events.emit('coach-buff-chosen', this.selectedId);

        this.scene.stop('CoachScene');
      },
    });
  }
}