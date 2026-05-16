## Setup Inicial

### 1. Clonar/Crear Repo
```bash
Clonar de GitHubds
git clone <URL>
cd coach-game
```

### 2. Instalar Dependencias (Node + npm)
```bash
# Verificar que Node está instalado
node -v && npm -v

# Crear package.json
npm init -y

# Instalar Phaser 3.55
npm install phaser@3.90.0

```

### 3.Estructura de Carpetas como se debe de ver a futuro
```
coach-game/
├── index.html          (Punto de entrada)
├── package.json        (Dependencias)
├── package-lock.json   (Auto-generado)
├── node_modules/       (Auto-generado)
├── src/
│   ├── main.js         (Inicializador del juego)
│   ├── config.js       (Config de Phaser)
│   ├── scenes/
│   │   ├── BootScene.js       (Carga assets)
│   │   ├── DialogueScene.js   (Preguntas entre rounds)
│   │   ├── CombatScene.js     (Pelea principal)
│   │   └── EndScene.js        (Victoria/Derrota)
│   ├── systems/
│   │   ├── DialogueSystem.js  (Gestionar preguntas/respuestas)
│   │   ├── BuffSystem.js      (Aplicar buffs/debuffs)
│   │   └── CombatSystem.js    (Lógica de combate)
│   └── assets/                (LOCAL - sprites van aquí después)
│       ├── sprites/           (Player, Coach, UI)
│       ├── audio/             (SFX, música)
│       └── data/
│           ├── dialogues.json (Preguntas)
│           └── stats.json     (Buffs/debuffs)
└── .gitignore

```
### Día a Día (Commits regulares)
```bash
# Antes y después de una feature
git status                              
git commit -m "feat: Combat loop working"
git push

```

### Branches (Opcional pero recomendado)
```bash
# Día 1: Main loop
git checkout -b day1-core-loop

# Día 2: Fases + Diálogos
git checkout -b day2-phases-dialogue

# Al terminar, merge a main
git checkout main
git merge day2-phases-dialogue
git push
```

---

## Checklist Setup (Hoy)
- [ ] Clonar/crear repo + push inicial
- [ ] Crear estructura de carpetas
- [ ] `npm install phaser@3.55.2`
- [ ] Verificar index.html carga sin errores
- [ ] Primer commit: "init: Project structure"
