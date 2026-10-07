/* Join-us modal: opens on the section-01 "Join us" button and sends
   name + email to a Google Sheet via a Google Apps Script web app.

   Next-meetup mode: visiting the page at /#next-meetup (the QR code on
   the meetup slides) opens the same modal with the NEXT_MEETUP text
   below and the same show and tell flow as meetup.html: a slot box
   (greyed out when the six are taken), "What will you share?", and the
   mailing-list box. It sends a meetup sign-up for NEXT_MEETUP.id, as
   meetup.html does (see MEETUPS in apps-script.gs). Update NEXT_MEETUP
   when the date changes.

   SETUP: follow the steps at the top of apps-script.gs, then paste
   your web app URL (ends in /exec) into SCRIPT_URL below. Until you
   do, submissions fall back to opening the visitor's email app.

   On a successful signup the panel turns indigo and pink logo forms
   burst out and un/remake themselves, like the background sketch. */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby7iZ0Pm7Fj7r4nG21KjCG-yX1Au_dctv4189Azmg9vI-wwLGdbLAHGD7ZdF0soQGd1/exec'; // ← paste your Apps Script web app URL here

const NEXT_MEETUP = {
  id: '2026-11-04',  // must match an id in MEETUPS in apps-script.gs
  kicker: 'Next meetup',
  title: 'Machines We Imagine meetup',
  date: '4 November',
  note: 'Wednesday 4 November 2026, 3–5pm, PR_B501E. Sign up to come along, and tick the box if you’d like a five-minute show and tell slot.',
};

const joinModal = document.getElementById('join-modal');
const joinForm = document.getElementById('join-form');
const joinDone = document.getElementById('join-done');
const submitButton = joinForm.querySelector('button[type="submit"]');
const joinPanel = joinModal.querySelector('.modal');
const joinThanks = document.getElementById('join-thanks');
const burstCanvas = joinModal.querySelector('.modal-burst');

// Text for each mode: the defaults come from the HTML.
const modeText = {
  join: {
    kicker: document.getElementById('join-kicker').textContent,
    title: document.getElementById('join-title').textContent,
    note: document.getElementById('join-note').textContent,
    thanks: joinThanks.textContent,
  },
  'next-meetup': NEXT_MEETUP,
};
let joinMode = 'join';

const meetupExtras = document.getElementById('join-meetup-extras');
const topicField = document.getElementById('join-topic-field');
const presentText = document.getElementById('join-present-text');

// "What will you share?" only shows once the show and tell box is ticked
function syncTopic() { topicField.hidden = !joinForm.present.checked; }
joinForm.present.addEventListener('change', syncTopic);

// Show and tell slots left for the next meetup. An older deployment of
// apps-script.gs ignores the meetup id and reports the last meetup's
// count, so we also ask about an id that doesn't exist: if that still
// gets a number, the count isn't for this meetup and we leave the box on.
let slotsChecked = false;
function checkSlots() {
  if (slotsChecked || !SCRIPT_URL) return;
  slotsChecked = true;
  const ask = (id) => fetch(`${SCRIPT_URL}?slots=1&meetup=${id}`).then((res) => res.json());
  Promise.all([ask(NEXT_MEETUP.id), ask('not-a-meetup').catch(() => ({}))])
    .then(([{ slotsLeft }, probe]) => {
      if (typeof slotsLeft !== 'number' || typeof probe.slotsLeft === 'number') return;
      if (slotsLeft > 0) {
        presentText.textContent = `I’d like a show and tell slot (five minutes, slides optional — ${slotsLeft} of 6 left)`;
        return;
      }
      joinForm.present.checked = false;
      joinForm.present.disabled = true;
      presentText.textContent = 'All six show and tell slots are taken. You can still sign up to come along.';
      syncTopic();
    })
    .catch(() => {});
}

function setMode(mode) {
  joinMode = mode;
  const text = modeText[mode];
  document.getElementById('join-kicker').textContent = text.kicker;
  document.getElementById('join-title').textContent = text.title;
  document.getElementById('join-note').textContent = text.note;
  joinThanks.textContent = text.thanks || '';
  meetupExtras.hidden = mode !== 'next-meetup';
  if (mode === 'next-meetup') { syncTopic(); checkSlots(); }
}

function setModal(open) {
  joinModal.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : ''; // stop page scroll behind the modal
  if (open) {
    joinForm.hidden = false;
    joinDone.hidden = true;
    joinForm.querySelector('input').focus();
  } else {
    stopBurst();
    joinPanel.classList.remove('success');
    joinThanks.hidden = true;
    // drop #next-meetup from the address bar so a reload doesn't reopen it
    if (location.hash === '#next-meetup') history.replaceState(null, '', location.pathname + location.search);
  }
}

document.getElementById('join-button').addEventListener('click', () => { setMode('join'); setModal(true); });

// /#next-meetup opens the modal in next-meetup mode, on load or when a link changes the hash
function openFromHash() {
  if (location.hash !== '#next-meetup') return;
  setMode('next-meetup');
  setModal(true);
}
window.addEventListener('hashchange', openFromHash);
openFromHash();
document.getElementById('join-close').addEventListener('click', () => setModal(false));
// click on the dark backdrop (not the panel) also closes
joinModal.addEventListener('click', (e) => { if (e.target === joinModal) setModal(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && joinModal.classList.contains('open')) setModal(false); });

joinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = joinForm.name.value.trim();
  const email = joinForm.email.value.trim();

  // Fallback while SCRIPT_URL is empty: pre-filled email instead
  if (!SCRIPT_URL) {
    const nextMeetup = joinMode === 'next-meetup';
    const subject = encodeURIComponent(nextMeetup ? 'Next meetup signup' : 'Mailing list signup');
    const body = encodeURIComponent(`${nextMeetup ? 'Please sign me up for the next Machines We Imagine meetup.' : 'Please add me to the Machines We Imagine mailing list.'}\n\nName: ${name}\nEmail: ${email}`);
    window.location.href = `mailto:hello@machinesweimagine.com?subject=${subject}&body=${body}`;
    showDone('Thanks. Your email app should have opened with the signup message ready to send.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Signing up…';
  try {
    // mode:'no-cors' is needed because Apps Script sends no CORS headers, so the
    // browser can't read the response, but the row still gets written.
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(joinMode === 'next-meetup'
        ? { type: 'meetup', meetup: NEXT_MEETUP.id, name, email,
            mailingList: joinForm.mailingList.checked,
            present: joinForm.present.checked,
            topic: joinForm.present.checked ? joinForm.topic.value.trim() : '' }
        : { name, email }),
    });
    if (joinMode === 'next-meetup') {
      const present = joinForm.present.checked, list = joinForm.mailingList.checked;
      joinThanks.textContent = 'Thanks, you’re signed up'
        + (present ? ' and down for a show and tell slot' : '')
        + (list ? ', and on the mailing list' : '')
        + `. See you on ${NEXT_MEETUP.date}.`;
    }
    showSuccess();
    joinForm.reset();
    syncTopic();
  } catch (err) {
    showDone('Something went wrong. Please email us instead at hello@machinesweimagine.com.');
  }
  submitButton.disabled = false;
  submitButton.textContent = 'Sign up';
});

function showDone(message) {
  joinDone.textContent = message;
  joinForm.hidden = true;
  joinDone.hidden = false;
}

// Success: flood the panel indigo, show the thank-you, start the burst
function showSuccess() {
  joinForm.hidden = true;
  joinDone.hidden = true;
  joinThanks.hidden = false;
  joinPanel.classList.add('success');
  startBurst();
}

// ---- success burst -------------------------------------------
// A small plain-canvas cousin of sketch.js: logo forms (triangles,
// bar, circle) in pink fly out from the middle already broken apart,
// remake themselves as they slow down, then keep drifting and
// un/remaking for as long as the panel is open.
const BURST_PINK = '242, 206, 209';
let burstFrame = null;

function burstPoints(kind, r) {
  const pts = [];
  if (kind === 'bar') {
    const w = r * 0.34, h = r * 1.15;
    pts.push([-w, -h], [w, -h], [w, h], [-w, h]);
  } else if (kind === 'circle') {
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI * 2 / 32;
      pts.push([Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82]);
    }
  } else {
    const start = kind === 'triangle' ? -Math.PI / 2 : Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const a = start + i * Math.PI * 2 / 3;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  return pts;
}

function startBurst() {
  stopBurst();
  const ctx = burstCanvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = burstCanvas.clientWidth, h = burstCanvas.clientHeight;
  burstCanvas.width = w * dpr;
  burstCanvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const kinds = ['triangle', 'triangleDown', 'bar', 'circle', 'triangle', 'triangleDown'];
  const unit = Math.min(w, h);

  const forms = Array.from({ length: 11 }, () => {
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const r = rand(unit * 0.07, unit * 0.2);
    const heading = rand(0, Math.PI * 2);
    const speed = still ? 0 : rand(2.5, 7);
    return {
      pts: burstPoints(kind, r), r,
      x: still ? rand(0, w) : w / 2 + rand(-20, 20),
      y: still ? rand(0, h) : h / 2 + rand(-20, 20),
      vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed,
      angle: rand(0, Math.PI * 2), spin: rand(-0.03, 0.03),
      unmade: still ? 0 : 1, direction: -1,   // start scattered, remake on the way out
      rate: rand(0.007, 0.013),
      seed: rand(0, 1000),
    };
  });

  let t = 0;
  function frame() {
    t++;
    ctx.clearRect(0, 0, w, h);
    for (const f of forms) {
      // the burst: fast out of the centre, easing to a slow drift
      f.vx *= 0.965; f.vy *= 0.965; f.spin *= 0.98;
      if (Math.hypot(f.vx, f.vy) < 0.25) { f.vx += rand(-0.02, 0.02); f.vy += rand(-0.02, 0.02); }
      f.x += f.vx; f.y += f.vy; f.angle += f.spin + 0.0015;

      // wrap at the panel edges
      const pad = f.r * 1.6;
      if (f.x < -pad) f.x = w + pad;
      if (f.x > w + pad) f.x = -pad;
      if (f.y < -pad) f.y = h + pad;
      if (f.y > h + pad) f.y = -pad;

      // un/remaking cycle, slower once the burst settles
      f.unmade += f.direction * f.rate;
      if (f.unmade <= 0) { f.unmade = 0; f.direction = 1; f.rate = rand(0.002, 0.005); }
      if (f.unmade >= 1) { f.unmade = 1; f.direction = -1; }

      drawBurstForm(ctx, f, t);
    }
    if (!still) burstFrame = requestAnimationFrame(frame);
  }
  frame();
}

// Same unmaking as sketch.js: edges shorten, push outward and wobble,
// with loose dots at the corners once mostly apart.
function drawBurstForm(ctx, f, t) {
  const gap = f.unmade * 0.42;
  const push = f.unmade * f.r * 0.55;
  const jitter = f.unmade * f.r * 0.16;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.angle);
  ctx.strokeStyle = `rgba(${BURST_PINK}, ${0.85 - f.unmade * 0.45})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const pts = f.pts, n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const len = Math.hypot(mx, my) || 1;
    const ox = (mx / len) * push, oy = (my / len) * push;
    const jx = Math.sin(f.seed + i * 2.1 + t * 0.02) * jitter;
    const jy = Math.cos(f.seed + i * 1.7 + t * 0.018) * jitter;
    ctx.moveTo(a[0] + (b[0] - a[0]) * gap * 0.5 + ox + jx, a[1] + (b[1] - a[1]) * gap * 0.5 + oy + jy);
    ctx.lineTo(b[0] - (b[0] - a[0]) * gap * 0.5 + ox + jx, b[1] - (b[1] - a[1]) * gap * 0.5 + oy + jy);
  }
  ctx.stroke();
  if (f.unmade > 0.55) {
    ctx.fillStyle = `rgba(${BURST_PINK}, ${(f.unmade - 0.55) * 1.6})`;
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p[0] * (1 + f.unmade * 0.5), p[1] * (1 + f.unmade * 0.5), 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function stopBurst() {
  if (burstFrame) cancelAnimationFrame(burstFrame);
  burstFrame = null;
}
