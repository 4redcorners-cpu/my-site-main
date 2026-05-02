/**
 * Попрыгунчик — вертикальный платформер на Canvas (аналог Doodle Jump).
 * Координаты мира: ось X вправо, ось Y вниз (как в Canvas).
 * Подключается как обычный скрипт, чтобы страница работала и по file://, и по HTTP.
 */

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const LEADERBOARD_KEY = "jamp_jamp_leaderboard_v1";
const LEADERBOARD_LIMIT = 5;

/** Гравитация (пиксели за кадр²), ускорение вниз. */
const GRAVITY = 0.48;
/** Вертикальная скорость в момент отрыва от платформы (вверх = отрицательное значение). */
const JUMP_VELOCITY = -10.2;
/** Горизонтальная скорость при удержании клавиш. */
const MOVE_SPEED = 5.2;
/** Верхний предел игрока на экране: при достижении 25% камера прокручивает мир вниз. */
const CAMERA_PLAYER_ANCHOR = 0.25;
/** Ширина платформы по умолчанию. */
const PLATFORM_WIDTH = 72;
/** Высота хитбокса платформы. */
const PLATFORM_HEIGHT = 14;
/** Множитель вертикальной скорости отталкивания для прыгучих платформ. */
const BOUNCE_JUMP_MULTIPLIER = 1.5;
/** Визуальный «толчок» платформы при прыжке игрока (только отрисовка, не хитбокс). */
const PLATFORM_BUMP_OFFSET = 12;
/** Затухание bump (визуальное смещение) за кадр при dt≈1. */
const PLATFORM_BUMP_DECAY = 0.8;
/** Через сколько мс без касаний SINKING начинает возврат к startY. */
const SINKING_IDLE_RETURN_DELAY_MS = 500;
/** Скорость возврата целевой позиции SINKING к startY после простоя. */
const SINKING_RETURN_LERP = 0.02;
/** Быстрое приближение к targetY, когда платформа опускается. */
const SINKING_FALL_LERP = 0.28;
/** Медленное приближение к targetY, когда платформа поднимается обратно. */
const SINKING_RISE_LERP = 0.06;
/** Физическое опускание платформы при каждом прыжке героя с неё. */
const JUMP_PLATFORM_DROP = 1.2;
/** Удаление почти совпадающих по высоте платформ с перекрытием по X. */
const PLATFORM_STACK_CULL_DY = 50;

/** Типы платформ: обычная, сильнее отскок, тонет под игроком. */
const PlatformType = {
  NORMAL: "NORMAL",
  BOUNCE: "BOUNCE",
  SINKING: "SINKING",
  MOVING: "MOVING",
  GLASS: "GLASS",
};

/** Размер персонажа (квадрат). */
const PLAYER_SIZE = 36;

/** Теоретический максимум высоты прыжка по формуле h = v² / (2g). */
function getMaxJumpHeight() {
  return (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
}

/** Запас проходимости: генерируем не выше 85% физического лимита. */
const SAFE_JUMP_RATIO = 0.85;
/** Глобальный безопасный предел по вертикали для генератора платформ. */
const MAX_VERTICAL_GAP = Math.floor(getMaxJumpHeight() * SAFE_JUMP_RATIO);
/** Минимальная вертикальная дистанция между соседними платформами. */
const MIN_VERTICAL_GAP = 80;
/** Максимум активных платформ в мире одновременно. */
const MAX_ACTIVE_PLATFORMS = 8;
/** Вертикальная зона, в которой запрещаем плотное горизонтальное наложение платформ. */
const PLATFORM_DENSITY_VERTICAL_BAND = 78;
/** Горизонтальный зазор между платформами на близких высотах. */
const PLATFORM_X_PADDING = 8;

/** Вертикальный период для редких облаков (~3–4× реже старой сетки). */
const CLOUD_VERTICAL_PERIOD = 520;
/** Параметры отдельных облаков: фаза по высоте, X, параллакс, масштаб, базовая прозрачность (глубина). */
const CLOUD_SPECS = [
  { phase: 0.1, x: 40, parallax: 0.07, scale: 1.02, opacity: 0.86 },
  { phase: 0.42, x: 220, parallax: 0.11, scale: 0.7, opacity: 0.5 },
  { phase: 0.68, x: 305, parallax: 0.06, scale: 0.9, opacity: 0.7 },
  { phase: 0.9, x: 125, parallax: 0.13, scale: 0.56, opacity: 0.4 },
  { phase: 0.28, x: 275, parallax: 0.09, scale: 0.78, opacity: 0.62 },
];

/** Геометрия «пухликов» облака: 4–5 кругов разного радиуса (локальные координаты, потом scale). */
const CLOUD_BLOBS_TEMPLATE = [
  { dx: 0, dy: 0, r: 26 },
  { dx: 22, dy: 8, r: 19 },
  { dx: 46, dy: 2, r: 22 },
  { dx: 24, dy: -14, r: 17 },
  { dx: 58, dy: -6, r: 15 },
];

/**
 * Рисует одно облако: сначала лёгкая голубая «тень», затем группа кругов с радиальным градиентом.
 * @param {number} opacity — множитель непрозрачности (параллакс / глубина)
 */
function drawCloudInstance(ctx, baseX, baseY, scale, opacity) {
  const blobs = CLOUD_BLOBS_TEMPLATE;

  ctx.save();
  ctx.globalAlpha = opacity * 0.5;
  for (const b of blobs) {
    const px = baseX + b.dx * scale + 4;
    const py = baseY + b.dy * scale + 6;
    const rr = b.r * scale * 1.08;
    const sh = ctx.createRadialGradient(px, py, 0, px, py, rr);
    sh.addColorStop(0, "rgba(140, 190, 220, 0.55)");
    sh.addColorStop(0.65, "rgba(170, 210, 235, 0.22)");
    sh.addColorStop(1, "rgba(200, 230, 250, 0)");
    ctx.beginPath();
    ctx.arc(px, py, rr, 0, Math.PI * 2);
    ctx.fillStyle = sh;
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = opacity;
  for (const b of blobs) {
    const px = baseX + b.dx * scale;
    const py = baseY + b.dy * scale;
    const rr = b.r * scale;
    const gr = ctx.createRadialGradient(
      px - rr * 0.25,
      py - rr * 0.25,
      0,
      px,
      py,
      rr,
    );
    gr.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    gr.addColorStop(0.45, "rgba(255, 255, 255, 0.9)");
    gr.addColorStop(0.85, "rgba(230, 244, 255, 0.82)");
    gr.addColorStop(1, "rgba(200, 228, 248, 0.65)");
    ctx.beginPath();
    ctx.arc(px, py, rr, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();
  }
  ctx.restore();
}

/** Только градиент неба (нижний слой фона). */
function drawSkyGradient(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  g.addColorStop(0, "#a8d8ff");
  g.addColorStop(0.55, "#87ceeb");
  g.addColorStop(1, "#6ec6e8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/**
 * Слой облаков под игровыми объектами: редкая сетка, параллакс, разный масштаб и opacity.
 * На экране одновременно ~4–6 экземпляров за счёт большого вертикального шага.
 */
function drawCloudLayer(ctx, cameraY) {
  for (const spec of CLOUD_SPECS) {
    const floatY = spec.phase * CLOUD_VERTICAL_PERIOD - cameraY * spec.parallax;
    for (let band = -1; band <= 1; band++) {
      const y = floatY + band * CLOUD_VERTICAL_PERIOD;
      if (y < -150 || y > CANVAS_HEIGHT + 150) continue;
      drawCloudInstance(ctx, spec.x, y, spec.scale, spec.opacity);
    }
  }
}

/**
 * Обрабатывает нажатия клавиш влево/вправо (стрелки и A/D).
 */
class Input {
  constructor() {
    this.left = false;
    this.right = false;
    /** Одноразовый запрос прыжка (Пробел), съедается игровым циклом. */
    this.jumpQueued = false;
    const down = (e) => this.#set(e.code, true, e);
    const up = (e) => this.#set(e.code, false, e);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
  }

  /** Возвращает true один раз на нажатие Пробела (для прыжка с тонущей платформы). */
  consumeJump() {
    if (!this.jumpQueued) return false;
    this.jumpQueued = false;
    return true;
  }

  /** Сбрасывает очередь прыжка (например, при рестарте). */
  clearJumpQueue() {
    this.jumpQueued = false;
  }

  /** Обновляет состояние клавиш по коду (keydown/keyup). */
  #set(code, value, e = null) {
    if (code === "ArrowLeft" || code === "KeyA") this.left = value;
    if (code === "ArrowRight" || code === "KeyD") this.right = value;
    if (code === "Space") {
      if (value) {
        if (e && e.repeat) return;
        this.jumpQueued = true;
        e?.preventDefault();
      }
    }
  }

  /** Возвращает направление движения по X: -1 влево, 1 вправо, 0 — нет ввода. */
  horizontalAxis() {
    if (this.left === this.right) return 0;
    return this.left ? -1 : 1;
  }

  setLeft(value) {
    this.left = value;
  }

  setRight(value) {
    this.right = value;
  }

  queueJump() {
    this.jumpQueued = true;
  }
}

/**
 * Прямоугольная платформа в мировых координатах с типом поведения и отрисовки.
 */
class Platform {
  /**
   * @param {number} worldX — левый край
   * @param {number} worldY — верхний край
   * @param {number} [width]
   * @param {string} [type] — значение из `PlatformType`
   */
  constructor(worldX, worldY, width = PLATFORM_WIDTH, type = PlatformType.NORMAL) {
    this.x = worldX;
    /** Базовый X для мягкого «дыхания» платформ (кроме MOVING). */
    this.baseX = worldX;
    this.y = worldY;
    /** Исходная верхняя граница (для SINKING — к ней возвращаемся, когда герой не стоит). */
    this.startY = worldY;
    /** Целевая высота платформы; для SINKING меняется ступенчато от факта прыжка. */
    this.targetY = worldY;
    /** Время последнего прыжка от платформы в миллисекундах. */
    this.lastJumpTime = -Infinity;
    this.width = width;
    this.height = PLATFORM_HEIGHT;
    this.type = type;
    /** Временный сдвиг отрисовки вниз (bump); хитбокс остаётся по this.y. */
    this.offsetY = 0;
    /** Сколько раз от этой платформы уже оттолкнулся герой. */
    this.bounceCount = 0;
    /** Параметры плавного покачивания влево-вправо (кроме MOVING). */
    this.swayAmplitude = this.type === PlatformType.MOVING ? 0 : 2 + Math.random() * 4;
    this.swaySpeed = 0.8 + Math.random() * 0.9;
    this.swayPhase = Math.random() * Math.PI * 2;
    /** Горизонтальная скорость для MOVING платформы. */
    this.speed = this.type === PlatformType.MOVING ? 1 + Math.random() * 0.8 : 0;
    /** Направление MOVING платформы: 1 вправо, -1 влево. */
    this.direction = Math.random() < 0.5 ? -1 : 1;
    /** Стадия трещин для стеклянной платформы (0..3). */
    this.crackLevel = 0;
    /** Разрушена ли стеклянная платформа. */
    this.broken = false;
  }

  /** Регистрирует факт прыжка героя от платформы (коллизия сверху). */
  onBounce() {
    this.bounceCount += 1;
    if (this.type === PlatformType.GLASS) {
      this.crackLevel = Math.min(3, this.crackLevel + 1);
      this.offsetY = PLATFORM_BUMP_OFFSET * 0.6;
      if (this.crackLevel >= 3) this.broken = true;
      return;
    }
    // Визуальный bump (offsetY) и физическое проседание (targetY) независимы.
    this.offsetY = PLATFORM_BUMP_OFFSET;
    if (this.type === PlatformType.SINKING) {
      // Моментальный физический шаг вниз + новая «ступень» цели.
      this.y += 4;
      this.targetY = Math.max(this.targetY + 20, this.y + 20);
      this.lastJumpTime = Date.now();
    } else if (this.bounceCount > 1) {
      // Для остальных типов сохраняем мягкое накопительное опускание.
      this.y += JUMP_PLATFORM_DROP;
      this.startY += JUMP_PLATFORM_DROP;
      this.targetY += JUMP_PLATFORM_DROP;
    }
  }

  /** Горизонтальное пересечение платформ (для блокировки SINKING при касании других). */
  #overlapX(other) {
    return this.x < other.x + other.width && this.x + this.width > other.x;
  }

  /**
   * Лимит опускания SINKING: возвращает максимальный y, чтобы не наехать на платформы ниже.
   * Infinity означает, что ограничения снизу нет.
   */
  #sinkCollisionLimit(platforms) {
    let limit = Infinity;
    for (const p of platforms) {
      if (p === this) continue;
      if (!this.#overlapX(p)) continue;
      if (p.y <= this.y) continue;
      const candidate = p.y - this.height;
      if (candidate < limit) limit = candidate;
    }
    return limit;
  }

  /**
   * Обновляет поведение платформы (движение/проседание/визуальный bump).
   * @param {Player} player
   * @param {number} dt — масштаб кадра
   * @param {Platform[]} platforms
   */
  update(player, dt, platforms = []) {
    if (this.offsetY > 0.01) {
      this.offsetY *= Math.pow(PLATFORM_BUMP_DECAY, dt);
      if (this.offsetY < 0.1) this.offsetY = 0;
    }

    if (this.type === PlatformType.MOVING) {
      const clampX = (v) => Math.max(0, Math.min(CANVAS_WIDTH - this.width, v));
      const overlapsOther = (x) =>
        platforms.some(
          (p) =>
            p !== this &&
            Math.abs(p.y - this.y) < PLATFORM_HEIGHT + 10 &&
            x < p.x + p.width &&
            x + this.width > p.x,
        );

      let nextX = this.x + this.speed * this.direction * dt;
      const blockedByWall = nextX < 0 || nextX + this.width > CANVAS_WIDTH;
      nextX = clampX(nextX);
      if (blockedByWall || overlapsOther(nextX)) {
        this.direction *= -1;
        const reboundX = clampX(this.x + this.speed * this.direction * dt);
        if (!overlapsOther(reboundX)) this.x = reboundX;
      } else {
        this.x = nextX;
      }
      return;
    }

    // Небольшое «оживление»: все платформы, кроме MOVING, плавно качаются по X.
    const t = Date.now() * 0.001;
    const sway = Math.sin(t * this.swaySpeed + this.swayPhase) * this.swayAmplitude;
    this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.width, this.baseX + sway));

    if (this.type !== PlatformType.SINKING) return;
    // Опускание после прыжка быстрее, возврат вверх медленнее.
    const follow = this.targetY > this.y ? SINKING_FALL_LERP : SINKING_RISE_LERP;
    let nextY = this.y + (this.targetY - this.y) * follow;
    if (nextY > this.y) {
      const limit = this.#sinkCollisionLimit(platforms);
      if (Number.isFinite(limit) && nextY > limit) {
        nextY = limit;
        this.targetY = Math.min(this.targetY, limit);
      }
    }
    this.y = nextY;
    if (Date.now() - this.lastJumpTime > SINKING_IDLE_RETURN_DELAY_MS) {
      this.targetY += (this.startY - this.targetY) * SINKING_RETURN_LERP;
    }
  }

  /** Отрисовывает платформу цветом, зависящим от типа, с учётом камеры. */
  draw(ctx, cameraY) {
    const sx = this.x;
    const sy = this.y + this.offsetY - cameraY;
    let fill;
    let stroke;
    if (this.type === PlatformType.BOUNCE) {
      fill = "#76ff03";
      stroke = "#64dd17";
    } else if (this.type === PlatformType.SINKING) {
      fill = "#bcaaa4";
      stroke = "#6d4c41";
    } else if (this.type === PlatformType.MOVING) {
      fill = "#42a5f5";
      stroke = "#1565c0";
    } else if (this.type === PlatformType.GLASS) {
      fill = "rgba(196, 240, 255, 0.48)";
      stroke = "#9ed8ef";
    } else {
      fill = "#2e7d32";
      stroke = "#1b5e20";
    }
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(sx, sy, this.width, this.height);
    ctx.fill();
    ctx.strokeRect(sx + 0.5, sy + 0.5, this.width - 1, this.height - 1);

    if (this.type === PlatformType.GLASS && this.crackLevel > 0) {
      ctx.strokeStyle = "rgba(120, 150, 170, 0.95)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + 10, sy + 2);
      ctx.lineTo(sx + this.width / 2, sy + this.height - 2);
      ctx.lineTo(sx + this.width - 12, sy + 3);
      if (this.crackLevel >= 2) {
        ctx.moveTo(sx + 6, sy + this.height - 3);
        ctx.lineTo(sx + this.width / 2 - 4, sy + 3);
        ctx.lineTo(sx + this.width - 8, sy + this.height - 4);
      }
      ctx.stroke();
    }
  }
}

/**
 * Игрок: гравитация, прыжок, сквозной выход за край экрана по X.
 */
class Player {
  constructor(worldX, worldY) {
    this.x = worldX;
    this.y = worldY;
    this.vx = 0;
    this.vy = 0;
    this.width = PLAYER_SIZE;
    this.height = PLAYER_SIZE;
    this.onGround = false;
    /** Масштабы squash&stretch (1 = нейтральная форма). */
    this.scaleX = 1;
    this.scaleY = 1;
  }

  /**
   * Интегрирует скорость и позицию за кадр, применяет гравитацию и горизонтальное управление,
   * затем обрабатывает «сквозной экран» по X.
   */
  update(dt, axis) {
    this.vx = axis * MOVE_SPEED;
    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const relax = Math.min(1, 0.1 * dt);
    this.scaleX += (1 - this.scaleX) * relax;
    this.scaleY += (1 - this.scaleY) * relax;
    this.#wrapHorizontal();
  }

  /** Сквозной мир: только когда герой полностью ушёл за край, он появляется с противоположной стороны. */
  #wrapHorizontal() {
    if (this.x + this.width < 0) this.x = CANVAS_WIDTH;
    else if (this.x > CANVAS_WIDTH) this.x = -this.width;
  }

  /**
   * Задаёт вертикальную скорость прыжка; множитель усиливает отскок (прыгучие платформы).
   * @param {number} [power=1] — 1 = базовый прыжок
   */
  jump(power = 1) {
    this.vy = JUMP_VELOCITY * power;
    this.onGround = false;
    this.scaleX = 0.8;
    this.scaleY = 1.2;
  }

  /** Жёлтый колобок: цельный шар с глазами, общей трансформацией squash&stretch. */
  draw(ctx, cameraY) {
    const cx = this.x + this.width / 2;
    const cy = this.y - cameraY + this.height / 2;
    const r = Math.min(this.width, this.height) / 2 - 2;
    const facing = this.vx >= 0 ? 1 : -1;
    const invStroke = 1 / Math.max(this.scaleX, this.scaleY);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(facing * this.scaleX, this.scaleY);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffeb3b";
    ctx.fill();
    ctx.strokeStyle = "#141414";
    ctx.lineWidth = 1.6 * invStroke;
    ctx.stroke();

    const eyeY = -r * 0.2;
    const eyeRx = r * 0.28;
    const eyeRy = r * 0.36;
    const pupilR = Math.max(2.8, r * 0.14);
    const pupilShift = r * 0.1;

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#141414";
    ctx.lineWidth = 1.25 * invStroke;

    ctx.beginPath();
    ctx.ellipse(-r * 0.3, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(r * 0.3, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0d0d0d";
    ctx.beginPath();
    ctx.arc(-r * 0.3 + pupilShift, eyeY + r * 0.05, pupilR, 0, Math.PI * 2);
    ctx.arc(r * 0.3 + pupilShift, eyeY + r * 0.05, pupilR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.beginPath();
    ctx.arc(-r * 0.34 + pupilShift, eyeY - r * 0.06, r * 0.045, 0, Math.PI * 2);
    ctx.arc(r * 0.26 + pupilShift, eyeY - r * 0.06, r * 0.045, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/** Проверяет пересечение двух прямоугольников с осями, параллельными осям координат (AABB). */
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Основной цикл игры: платформы, камера, счёт, проигрыш.
 */
class Game {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = input;
    this.platforms = [];
    this.player = null;
    this.cameraY = 0;
    /** Лучшая (минимальная) world Y игрока — чем меньше, тем выше поднялся. */
    this.bestPlayerY = 0;
    /** Стартовая высота для подсчёта очков. */
    this.scoreBaselineY = 0;
    this.running = false;
    this.gameOverEl = document.getElementById("gameOver");
    this.finalScoreEl = document.getElementById("finalScore");
    this.restartBtn = document.getElementById("restart");
    this.pinScoreBtn = document.getElementById("pinScore");
    this.leaderboardListEl = document.getElementById("leaderboardList");
    this.currentScore = 0;
    this.leaderboard = this.#loadLeaderboard();
    this.restartBtn.addEventListener("click", () => this.start());
    this.pinScoreBtn.addEventListener("click", () => this.#pinCurrentScore());
    window.addEventListener("keydown", (e) => this.#handleRestartHotkey(e));
    this.#renderLeaderboard();
  }

  #loadLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item.name === "string" && Number.isFinite(item.score))
        .sort((a, b) => b.score - a.score)
        .slice(0, LEADERBOARD_LIMIT);
    } catch (_error) {
      return [];
    }
  }

  #saveLeaderboard() {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.leaderboard));
    } catch (_error) {
      /* Quota, приватный режим и др. — не ломаем игру */
    }
  }

  #medalLabel(rank) {
    return `${rank} место`;
  }

  #renderLeaderboard() {
    if (!this.leaderboardListEl) return;
    this.leaderboardListEl.replaceChildren();
    if (this.leaderboard.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "Пока нет результатов";
      this.leaderboardListEl.append(empty);
      return;
    }
    this.leaderboard.forEach((item, index) => {
      const rank = index + 1;
      const li = document.createElement("li");
      if (rank <= 3) li.classList.add(`top-${rank}`);
      const rankSpan = document.createElement("span");
      rankSpan.className = "lb-rank";
      rankSpan.textContent = this.#medalLabel(rank);
      const nameSpan = document.createElement("span");
      nameSpan.textContent = item.name;
      const scoreSpan = document.createElement("span");
      scoreSpan.className = "lb-score";
      scoreSpan.textContent = String(item.score);
      li.append(rankSpan, nameSpan, scoreSpan);
      this.leaderboardListEl.append(li);
    });
  }

  #pushScore(name, score) {
    this.leaderboard.push({ name, score });
    this.leaderboard = this.leaderboard
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_LIMIT);
    this.#saveLeaderboard();
    this.#renderLeaderboard();
  }

  #pinCurrentScore() {
    const entered = window.prompt("Введите имя игрока:");
    if (!entered) return;
    const name = entered.trim().slice(0, 20);
    if (!name) return;
    this.#pushScore(name, this.currentScore);
  }

  /** Перезапускает игру по Enter, только если открыт экран Game Over. */
  #handleRestartHotkey(e) {
    if (e.code !== "Enter") return;
    if (!this.gameOverEl.classList.contains("visible")) return;
    e.preventDefault();
    this.start();
  }

  /** Полный сброс уровня: игрок, камера, платформы, снятие экрана проигрыша. */
  start() {
    this.gameOverEl.classList.remove("visible");
    this.input.clearJumpQueue();
    this.cameraY = 0;
    this.platforms = [];
    const groundY = CANVAS_HEIGHT - 100;
    // Немного «вдавливаем» в платформу, чтобы AABB гарантированно пересёкся на первом кадре.
    this.player = new Player(CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, groundY - PLAYER_SIZE + 1);
    this.player.onGround = true;
    this.player.vy = 0;
    this.bestPlayerY = this.player.y;
    this.scoreBaselineY = this.player.y;

    const firstPlatform = new Platform(
      CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2,
      groundY,
      PLATFORM_WIDTH,
      PlatformType.NORMAL,
    );
    this.platforms.push(firstPlatform);
    let anchorPlatform = firstPlatform;
    while (anchorPlatform.y > this.cameraY - MAX_VERTICAL_GAP * 2 && this.platforms.length < MAX_ACTIVE_PLATFORMS) {
      const next = this.#spawnPlatformRowAbove(anchorPlatform);
      if (next === anchorPlatform) break;
      anchorPlatform = next;
    }
    this.#cullStackedPlatforms();

    this.running = true;
    this.lastTime = performance.now();
    if (!this._boundLoop) {
      this._boundLoop = this.loop.bind(this);
      requestAnimationFrame(this._boundLoop);
    }
  }

  /**
   * Оценивает достижимую высоту при заданном горизонтальном смещении.
   * Чем дальше по X, тем ниже должен быть следующий уступ.
   */
  #maxVerticalGapForHorizontal(dx) {
    const absV0 = Math.abs(JUMP_VELOCITY);
    const t = dx / MOVE_SPEED;
    const flightTime = (2 * absV0) / GRAVITY;
    if (t > flightTime) return 0;
    const y = absV0 * t - 0.5 * GRAVITY * t * t;
    return Math.max(0, y * SAFE_JUMP_RATIO);
  }

  /**
   * Возвращает максимальный допустимый горизонтальный сдвиг для данной высоты прыжка.
   * Использует «поздний» корень траектории (фаза падения), чтобы не занижать достижимость.
   */
  #maxHorizontalForVertical(verticalGap) {
    const absV0 = Math.abs(JUMP_VELOCITY);
    const maxH = getMaxJumpHeight();
    const h = Math.max(0, Math.min(verticalGap / SAFE_JUMP_RATIO, maxH));
    const d = Math.max(0, absV0 * absV0 - 2 * GRAVITY * h);
    const tLate = (absV0 + Math.sqrt(d)) / GRAVITY;
    return MOVE_SPEED * tLate;
  }

  /** Средняя цель по X для платформы (для MOVING берём среднюю позицию траектории). */
  #targetCenterX(type, x, width) {
    if (type === PlatformType.MOVING) return CANVAS_WIDTH / 2;
    return x + width / 2;
  }

  /** Проверка перекрытия по X с дополнительным отступом. */
  #overlapX(x1, w1, x2, w2, pad = 0) {
    return x1 < x2 + w2 + pad && x1 + w1 + pad > x2;
  }

  /** Проверяет, не накладывается ли новая платформа на соседние по высоте. */
  #hasSpawnConflict(x, width, y) {
    return this.platforms.some(
      (p) =>
        Math.abs(p.y - y) < PLATFORM_DENSITY_VERTICAL_BAND &&
        this.#overlapX(x, width, p.x, p.width, PLATFORM_X_PADDING),
    );
  }

  /**
   * Создаёт новую платформу выше предыдущей с математической проверкой проходимости:
   * - вертикальный шаг не выше 85% от h=v²/(2g);
   * - при большом горизонтальном сдвиге максимально допустимый шаг уменьшается;
   * - если рандом дал слишком высокий уступ, платформа принудительно опускается ниже.
   * @returns {Platform}
   */
  #spawnPlatformRowAbove(basePlatform) {
    const type = this.#randomPlatformType();
    const w = PLATFORM_WIDTH - 8 + Math.floor(Math.random() * 24);
    const maxX = CANVAS_WIDTH - w;
    const baseCenterX = basePlatform.x + basePlatform.width / 2;

    const maxDxForMinGap = this.#maxHorizontalForVertical(MIN_VERTICAL_GAP);
    const projectCandidate = (rawX) => {
      let x = Math.max(0, Math.min(maxX, rawX));
      let center = this.#targetCenterX(type, x, w);
      let dx = Math.abs(center - baseCenterX);
      if (dx > maxDxForMinGap) {
        const sign = center >= baseCenterX ? 1 : -1;
        center = baseCenterX + sign * maxDxForMinGap;
        x = Math.max(0, Math.min(maxX, center - w / 2));
        center = this.#targetCenterX(type, x, w);
        dx = Math.abs(center - baseCenterX);
      }
      return { x, dx };
    };

    const randomGap =
      MIN_VERTICAL_GAP +
      Math.random() * Math.max(8, MAX_VERTICAL_GAP - MIN_VERTICAL_GAP - 8);

    let candidate = projectCandidate(Math.random() * maxX);
    let horizontalLimitedGap = this.#maxVerticalGapForHorizontal(candidate.dx);
    let guaranteedGap = Math.max(MIN_VERTICAL_GAP, Math.min(MAX_VERTICAL_GAP, horizontalLimitedGap));
    let gap = Math.min(randomGap, guaranteedGap);
    let newY = basePlatform.y - gap;
    let ok = !this.#hasSpawnConflict(candidate.x, w, newY);

    for (let i = 0; i < 20 && !ok; i++) {
      candidate = projectCandidate(Math.random() * maxX);
      horizontalLimitedGap = this.#maxVerticalGapForHorizontal(candidate.dx);
      guaranteedGap = Math.max(MIN_VERTICAL_GAP, Math.min(MAX_VERTICAL_GAP, horizontalLimitedGap));
      gap = Math.min(randomGap, guaranteedGap);
      newY = basePlatform.y - gap;
      ok = !this.#hasSpawnConflict(candidate.x, w, newY);
    }

    if (!ok) {
      for (let sx = 0; sx <= maxX && !ok; sx += 10) {
        candidate = projectCandidate(sx);
        horizontalLimitedGap = this.#maxVerticalGapForHorizontal(candidate.dx);
        guaranteedGap = Math.max(MIN_VERTICAL_GAP, Math.min(MAX_VERTICAL_GAP, horizontalLimitedGap));
        gap = Math.min(randomGap, guaranteedGap);
        newY = basePlatform.y - gap;
        ok = !this.#hasSpawnConflict(candidate.x, w, newY);
      }
    }

    const x = Math.max(0, Math.min(maxX, candidate.x));
    const platform = new Platform(x, newY, w, type);
    if (platform.y > basePlatform.y - 80) return basePlatform;
    this.platforms.push(platform);
    return platform;
  }

  /** Выбирает тип новой платформы, включая стеклянные по всему ранy. */
  #randomPlatformType() {
    const r = Math.random();
    if (r < 0.5) return PlatformType.NORMAL;
    if (r < 0.65) return PlatformType.BOUNCE;
    if (r < 0.8) return PlatformType.SINKING;
    if (r < 0.9) return PlatformType.MOVING;
    return PlatformType.GLASS;
  }

  /** Поднимает камеру вместе с игроком, создавая ощущение бесконечного восхождения. */
  #updateCamera() {
    const anchor = CANVAS_HEIGHT * CAMERA_PLAYER_ANCHOR;
    const desiredTop = this.player.y - anchor;
    if (desiredTop < this.cameraY) this.cameraY = desiredTop;
  }

  /** Удаляет платформы, ушедшие под нижний край экрана, и порождает новые над полем зрения. */
  #recyclePlatforms() {
    const bottom = this.cameraY + CANVAS_HEIGHT;
    this.platforms = this.platforms.filter((p) => p.y <= bottom);
    if (this.platforms.length === 0) {
      const fallbackY = this.cameraY + CANVAS_HEIGHT - 40;
      this.platforms.push(
        new Platform(CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2, fallbackY, PLATFORM_WIDTH, PlatformType.NORMAL),
      );
    }

    let topPlatform = this.platforms.reduce((acc, p) => (p.y < acc.y ? p : acc), this.platforms[0]);
    const topMargin = this.cameraY - MAX_VERTICAL_GAP * 3;
    while (topPlatform.y > topMargin && this.platforms.length < MAX_ACTIVE_PLATFORMS) {
      const next = this.#spawnPlatformRowAbove(topPlatform);
      if (next === topPlatform) break;
      topPlatform = next;
    }
    this.#cullStackedPlatforms();
  }

  /** Убирает почти совпадающие по Y платформы с перекрытием по X (наслоение). */
  #cullStackedPlatforms() {
    if (this.platforms.length <= 1) return;
    const sorted = [...this.platforms].sort((a, b) => a.y - b.y);
    const kept = [];
    for (const p of sorted) {
      const stacked = kept.some(
        (k) =>
          k.type !== PlatformType.SINKING &&
          k.type !== PlatformType.GLASS &&
          p.type !== PlatformType.SINKING &&
          p.type !== PlatformType.GLASS &&
          Math.abs(k.y - p.y) < PLATFORM_STACK_CULL_DY &&
          this.#overlapX(k.x, k.width, p.x, p.width, PLATFORM_X_PADDING),
      );
      if (!stacked) kept.push(p);
    }
    this.platforms = kept;
  }

  /**
   * Разрешает столкновения с платформами: отскок только если игрок падал сверху на площадку,
   * а не врезался сбоку снизу.
   */
  #resolvePlatforms() {
    // Прыжок от платформы срабатывает только в фазе падения.
    if (this.player.vy <= 0) return;

    const playerBox = {
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height,
    };

    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      const plat = { x: p.x, y: p.y, width: p.width, height: p.height };
      if (!rectsOverlap(playerBox, plat)) continue;

      const prevBottom = this.player.y - this.player.vy + this.player.height;
      if (prevBottom <= p.y + 4) {
        this.player.y = p.y - this.player.height;
        this.player.vy = 0;
        this.player.onGround = true;
        p.onBounce();
        if (p.type === PlatformType.BOUNCE) {
          this.player.jump(BOUNCE_JUMP_MULTIPLIER);
        } else {
          this.player.jump(1);
        }
        if (p.type === PlatformType.GLASS && p.broken) {
          this.platforms.splice(i, 1);
        }
        break;
      }
    }
  }

  /** Обновляет лучшую достигнутую высоту и возвращает целочисленный счёт. */
  #updateScore() {
    if (this.player.y < this.bestPlayerY) this.bestPlayerY = this.player.y;
    return Math.max(0, Math.floor((this.scoreBaselineY - this.bestPlayerY) / 12));
  }

  /** Проигрыш: нижняя точка персонажа ниже кадра (падение в «пропасть»). */
  #isOutOfBounds() {
    const screenBottom = this.player.y - this.cameraY + this.player.height;
    return screenBottom > CANVAS_HEIGHT + 4;
  }

  /** Останавливает симуляцию и показывает оверлей с кнопкой перезапуска. */
  #triggerGameOver(score) {
    this.running = false;
    this.input.clearJumpQueue();
    this.currentScore = score;
    this.finalScoreEl.textContent = `Счёт: ${score}`;
    this.gameOverEl.classList.add("visible");
    this.#renderLeaderboard();
  }

  /** Один игровой тик: ввод, физика, коллизии, камера, рециклинг платформ, проверка проигрыша. */
  update(dt) {
    if (!this.running || !this.player) return;

    const axis = this.input.horizontalAxis();
    /* Сначала платформы (тонущие тянут героя вниз по актуальному контакту), затем физика игрока — иначе проседание не успевает при отскоке. */
    for (const p of this.platforms) p.update(this.player, dt, this.platforms);
    this.player.update(dt, axis);
    this.#resolvePlatforms();
    if (this.input.consumeJump() && this.player.onGround) {
      this.player.jump(1);
    }
    this.#updateCamera();
    this.#recyclePlatforms();

    const score = this.#updateScore();
    if (this.#isOutOfBounds()) this.#triggerGameOver(score);
  }

  /** Отрисовка кадра: сначала небо и облака (под всем), затем платформы, герой, HUD. */
  draw(score) {
    const ctx = this.ctx;
    drawSkyGradient(ctx);
    drawCloudLayer(ctx, this.cameraY);

    for (const p of this.platforms) {
      if (p.y + p.height < this.cameraY || p.y > this.cameraY + CANVAS_HEIGHT) continue;
      p.draw(ctx, this.cameraY);
    }

    if (this.player) this.player.draw(ctx, this.cameraY);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(8, 8, 120, 32);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px system-ui,sans-serif";
    ctx.fillText(`Очки: ${score}`, 18, 30);
  }

  /** Бесконечный цикл кадров: dt-нормализация, update/draw, планирование следующего кадра. */
  loop(now) {
    const rawDt = (now - this.lastTime) / (1000 / 60);
    this.lastTime = now;
    const dt = Math.min(rawDt, 3);

    let score = 0;
    if (this.running && this.player) {
      this.update(dt);
      score = this.#updateScore();
    } else if (this.player) {
      score = Math.max(0, Math.floor((this.scoreBaselineY - this.bestPlayerY) / 12));
    }

    this.draw(score);
    requestAnimationFrame(this._boundLoop);
  }
}

const canvas = document.getElementById("game");
const input = new Input();
const game = canvas ? new Game(canvas, input) : null;

/**
 * Только Pointer Events — без дублирования touch и mouse (меньше конфликтов и «залипаний»).
 * Старые браузеры без PointerEvent: клавиатура всё ещё работает.
 */
function bindMobileControls(inputRef) {
  const leftBtn = document.getElementById("mcLeft");
  const rightBtn = document.getElementById("mcRight");
  const jumpBtn = document.getElementById("mcJump");
  if (!leftBtn || !rightBtn || !jumpBtn) return;
  if (!window.PointerEvent) return;

  const bindHold = (btn, setState) => {
    const release = () => {
      setState(false);
      btn.classList.remove("active");
    };
    const press = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      setState(true);
      btn.classList.add("active");
      if (typeof e.pointerId === "number") btn.setPointerCapture?.(e.pointerId);
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("lostpointercapture", release);
  };

  bindHold(leftBtn, (pressed) => inputRef.setLeft(pressed));
  bindHold(rightBtn, (pressed) => inputRef.setRight(pressed));

  const jumpPress = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    inputRef.queueJump();
    jumpBtn.classList.add("active");
  };
  const clearJumpActive = () => jumpBtn.classList.remove("active");
  jumpBtn.addEventListener("pointerdown", jumpPress);
  jumpBtn.addEventListener("pointerup", clearJumpActive);
  jumpBtn.addEventListener("pointercancel", clearJumpActive);
  jumpBtn.addEventListener("pointerleave", clearJumpActive);
}

bindMobileControls(input);
if (game) game.start();
