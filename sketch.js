/* ============================================================
   Machines We Imagine — background sketch (p5.js, global mode)
   ------------------------------------------------------------
   A field of forms borrowed from the logo (triangles, bars,
   circles) drifts across the screen. Each form is continuously
   "unmaking" (its edges retract and drift apart) or "remaking"
   (they close back up). Collisions and the mouse push forms
   toward unmaking; scrolling speeds the whole field up and
   slowly rotates it.

   Tweakables are collected in the SETTINGS block below.
   ============================================================ */

const SETTINGS = {
  formsDesktop: 15,     // number of forms on wide screens
  formsMobile: 8,       // number on screens under 700px
  strokeAlphaMax: 78,   // line opacity 0-255 (keep low so text stays legible)
  minSize: 0.07,        // form radius as fraction of the shorter screen edge
  maxSize: 0.24,
  mouseReach: 2.4,      // how close (in form radii) the cursor must be to unmake a form
  respawnChance: 0.35,  // chance a fully-remade form becomes a *different* shape
};

// The indigo tints from the brand palette (RGB triplets).
const TINTS = [
  [152, 133, 166],  // #9885A6
  [92, 84, 140],    // #5C548C
  [68, 66, 140],    // #44428C
  [48, 52, 140],    // #30348C
];

let forms = [];        // every drifting shape on screen
let fieldRotation = 0; // whole-field rotation, driven by scrolling
let scrollVelocity = 0;
let lastScrollY = 0;

// ---- shape outlines -----------------------------------------
// Each shape is a list of [x, y] corner points around its center.
// (The circle is a 40-sided polygon so it can "break apart" edge
// by edge like the others.)
function pointsFor(kind, r) {
  const pts = [];
  if (kind === 'triangle' || kind === 'triangleDown') {
    const start = kind === 'triangle' ? -HALF_PI : HALF_PI;
    for (let i = 0; i < 3; i++) {
      const a = start + i * TWO_PI / 3;
      pts.push([cos(a) * r, sin(a) * r]);
    }
  } else if (kind === 'bar') {
    const w = r * 0.34, h = r * 1.15;
    pts.push([-w, -h], [w, -h], [w, h], [-w, h]);
  } else if (kind === 'circle') {
    for (let i = 0; i < 40; i++) {
      const a = i * TWO_PI / 40;
      pts.push([cos(a) * r * 0.82, sin(a) * r * 0.82]);
    }
  }
  return pts;
}

// ---- creating a form ----------------------------------------
function spawnForm(x, y) {
  const kinds = ['triangle', 'triangleDown', 'bar', 'circle', 'triangle', 'triangleDown'];
  const kind = random(kinds);
  const r = random(min(width, height) * SETTINGS.minSize,
                   min(width, height) * SETTINGS.maxSize);
  return {
    kind,
    r,
    pts: pointsFor(kind, r),
    x: x === undefined ? random(width) : x,
    y: y === undefined ? random(height) : y,
    vx: random(-0.28, 0.28),      // drift speed
    vy: random(-0.22, 0.22),
    angle: random(TWO_PI),
    spin: random(-0.0022, 0.0022),
    unmade: random(0, 0.25),      // 0 = whole, 1 = fully dissolved
    direction: random() < 0.5 ? 1 : -1,  // 1 = unmaking, -1 = remaking
    rate: random(0.0018, 0.005),  // how fast it un/remakes
    tint: random(TINTS),
    seed: random(1000),           // per-form randomness for the jitter
  };
}

// ---- p5 lifecycle --------------------------------------------
function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('bg');            // put the canvas in the fixed #bg layer
  pixelDensity(min(2, window.devicePixelRatio || 1));
  const n = width < 700 ? SETTINGS.formsMobile : SETTINGS.formsDesktop;
  for (let i = 0; i < n; i++) forms.push(spawnForm());
  noFill();
  strokeCap(SQUARE);

  // Track scrolling: velocity feeds drift speed + field rotation.
  window.addEventListener('scroll', () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    scrollVelocity += y - lastScrollY;
    lastScrollY = y;
  }, { passive: true });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  clear(); // transparent canvas — the pink page shows through

  scrollVelocity *= 0.9; // ease back to zero after scrolling stops
  fieldRotation += scrollVelocity * 0.00012;
  const drift = 1 + min(3.2, abs(scrollVelocity) * 0.035);

  const mouseOnScreen = mouseX > 0 && mouseY > 0 && mouseX < width && mouseY < height;

  for (let i = 0; i < forms.length; i++) {
    const f = forms[i];

    // drift + spin (faster while scrolling)
    f.x += f.vx * drift;
    f.y += f.vy * drift + scrollVelocity * 0.012;
    f.angle += f.spin * drift;

    // wrap around the screen edges
    const pad = f.r * 1.8;
    if (f.x < -pad) f.x = width + pad;
    if (f.x > width + pad) f.x = -pad;
    if (f.y < -pad) f.y = height + pad;
    if (f.y > height + pad) f.y = -pad;

    // collisions: overlapping forms start unmaking and nudge apart
    for (let j = i + 1; j < forms.length; j++) {
      const g = forms[j];
      const d = dist(f.x, f.y, g.x, g.y);
      if (d < (f.r + g.r) * 0.78) {
        f.direction = 1;
        g.direction = 1;
        const nx = (f.x - g.x) / (d || 1);
        const ny = (f.y - g.y) / (d || 1);
        f.vx += nx * 0.006; f.vy += ny * 0.006;
        g.vx -= nx * 0.006; g.vy -= ny * 0.006;
      }
    }

    // the cursor pulls nearby forms apart
    if (mouseOnScreen && dist(f.x, f.y, mouseX, mouseY) < f.r * SETTINGS.mouseReach) {
      f.unmade = min(1, f.unmade + 0.02);
      f.direction = 1;
    }

    // advance the un/remaking cycle
    f.unmade += f.direction * f.rate * drift;
    if (f.unmade >= 1) { f.unmade = 1; f.direction = -1; } // fully dissolved -> start remaking
    if (f.unmade <= 0) {
      f.unmade = 0;
      f.direction = 1;
      // once whole again, sometimes come back as a different shape
      if (random() < SETTINGS.respawnChance) forms[i] = spawnForm(f.x, f.y);
    }

    f.vx = constrain(f.vx, -0.7, 0.7);
    f.vy = constrain(f.vy, -0.7, 0.7);

    drawForm(forms[i]);
  }
}

// ---- drawing one form ----------------------------------------
// While a form unmakes: each edge shortens (gap), drifts outward
// from the center (push), and wobbles (jitter). Past 60% unmade,
// small dots appear at the corners like loose fragments.
function drawForm(f) {
  const gap = f.unmade * 0.42;
  const push = f.unmade * f.r * 0.55;
  const jitter = f.unmade * f.r * 0.16;

  push2D(f, () => {
    const alpha = (200 * (1 - f.unmade * 0.55) + 30) * (SETTINGS.strokeAlphaMax / 230);
    stroke(f.tint[0], f.tint[1], f.tint[2], alpha);
    strokeWeight(1.25);

    const pts = f.pts, n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      // outward direction of this edge (from shape center through edge midpoint)
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const len = Math.hypot(mx, my) || 1;
      const ox = (mx / len) * push, oy = (my / len) * push;
      // gentle per-edge wobble
      const jx = sin(f.seed + i * 2.1 + frameCount * 0.006) * jitter;
      const jy = cos(f.seed + i * 1.7 + frameCount * 0.005) * jitter;
      // shorten the edge from both ends
      const ax = a[0] + (b[0] - a[0]) * gap * 0.5;
      const ay = a[1] + (b[1] - a[1]) * gap * 0.5;
      const bx = b[0] - (b[0] - a[0]) * gap * 0.5;
      const by = b[1] - (b[1] - a[1]) * gap * 0.5;
      line(ax + ox + jx, ay + oy + jy, bx + ox + jx, by + oy + jy);
    }

    // corner fragments once mostly unmade
    if (f.unmade > 0.55) {
      noStroke();
      fill(48, 52, 140, (f.unmade - 0.55) * 240);
      for (const p of pts) circle(p[0] * (1 + f.unmade * 0.5), p[1] * (1 + f.unmade * 0.5), 2.6);
      noFill();
    }
  });
}

// tiny helper: translate/rotate, draw, restore
function push2D(f, fn) {
  push();
  translate(f.x, f.y);
  rotate(f.angle + fieldRotation);
  fn();
  pop();
}
