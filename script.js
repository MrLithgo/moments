// -----------------------------------------------------
// Globals & constants
// -----------------------------------------------------
let masses = [];
let massCounter = 1;
let draggedMass = null;
let dragOffset = { x: 0, y: 0 };
let activePointerId = null;
let advancedMode = false;

let originalParent = null;
let nextSibling = null;

// Scale inset so ticks/labels/zones/snap sit inside the beam ends
const SCALE_INSET_PX = 40;        // tweak 24–60 to taste

// Force & arrow visuals
const GRAVITY_N_PER_KG = 10;      // 1 kg -> 10 N (as requested)
const ARROW_PX_PER_NEWTON = 0.8;  // 10 N -> 8 px shaft (1 kg)
const ARROW_MIN_PX = 12;
const ARROW_MAX_PX = 60;          // clamp so 5 kg arrow isn’t huge

// -----------------------------------------------------
// Geometry helpers
// -----------------------------------------------------
function getBeamWidth() {
  const beam = document.getElementById('beam');
  return beam ? beam.offsetWidth : 980 * 0.95;
}
function getInsetSpacingPx() {
  const bw = getBeamWidth();
  const usable = Math.max(0, bw - 2 * SCALE_INSET_PX);
  return usable / 24; // 25 marks (-12..+12) => 24 intervals
}

// -----------------------------------------------------
// Init
// -----------------------------------------------------
function init() {
  createScale();
  createDropZones();
  updateBeamBalance();
  renderMassOptionTiles();
  updateResultsTableHeadings();

  // Controls
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);

  // Storage tiles (drag-to-create)
  document.querySelectorAll('.mass-option').forEach(option => {
    option.addEventListener('pointerdown', startCreateDrag, { passive: false });
  });

  // Advanced toggle (optional checkbox with id="advancedToggle")
  const adv = document.getElementById('advancedToggle');
if (adv) {
  adv.checked = false;
  adv.setAttribute('aria-checked', 'false');
  advancedMode = adv.checked;

  adv.addEventListener('change', () => {
    advancedMode = adv.checked;
    adv.setAttribute('aria-checked', adv.checked ? 'true' : 'false');
  });
}
  // Moment inputs: validate while typing
  const leftMoment  = document.getElementById('leftMoment');
  const rightMoment = document.getElementById('rightMoment');
  ['input','change','blur'].forEach(ev => {
    leftMoment?.addEventListener(ev, updateMomentFeedback);
    rightMoment?.addEventListener(ev, updateMomentFeedback);
  });

  updateMomentFeedback();
}

// -----------------------------------------------------
// Scale / zones
// -----------------------------------------------------
function createScale() {
  const scale = document.querySelector('.scale');
  scale.innerHTML = '';
  const spacing = getInsetSpacingPx();
  const beamWidth = getBeamWidth();
  const centerPosition = beamWidth / 2;

  for (let i = -12; i <= 12; i++) {
    const mark = document.createElement('div');
    mark.className = 'scale-mark';
    mark.style.position = 'absolute';
    mark.style.left = `${centerPosition + (i * spacing)}px`;
    mark.style.transform = 'translateX(-50%)';

    if (i % 2 === 0) {
      const number = document.createElement('div');
      number.className = 'scale-number';
      number.textContent = Math.abs(i);
      number.style.left = `${centerPosition + (i * spacing)}px`;
      number.style.transform = 'translateX(-50%)';
      scale.appendChild(number);
    }
    scale.appendChild(mark);
  }
}

function createDropZones() {
  const container = document.querySelector('.beam');
  document.querySelectorAll('.drop-zone').forEach(zone => zone.remove());
  const spacing = getInsetSpacingPx();
  const beamWidth = getBeamWidth();
  const centerPosition = beamWidth / 2;

  for (let i = -12; i <= 12; i++) {
    const zone = document.createElement('div');
    zone.className = 'drop-zone';
    zone.style.left = `${centerPosition + (i * spacing)}px`;
    zone.style.transform = 'translateX(-50%)';
    zone.dataset.position = i;
    container.appendChild(zone);
  }
}

// -----------------------------------------------------
// Storage tiles (no hooks; just the block with number)
// -----------------------------------------------------
function renderMassOptionTiles() {
  document.querySelectorAll('.mass-option').forEach(opt => {
    const value = parseInt(opt.dataset.value, 10);
    opt.innerHTML = '';
    const mass = document.createElement('div');
    mass.className = `mass mass-value-${value}`;
    mass.textContent = value; // label on the block
    opt.appendChild(mass);
  });
}

// -----------------------------------------------------
// Create a full mass element (with hooks) for the beam
// + include a force arrow scaffold
// -----------------------------------------------------
function createMassElement(value) {
  const massContainer = document.createElement('div');
  massContainer.className = 'mass-container';
  massContainer.dataset.value = String(value);

  const hookTop = document.createElement('div'); hookTop.className = 'hook-top';
  const hook    = document.createElement('div'); hook.className    = 'hook';
  const mass    = document.createElement('div'); mass.className    = `mass mass-value-${value}`;
  mass.textContent = value;

  // Force arrow scaffold (shaft + head + label)
  const arrow = document.createElement('div'); arrow.className = 'force-arrow';
  const shaft = document.createElement('div'); shaft.className = 'force-shaft';
  const head  = document.createElement('div'); head.className  = 'force-head';
  const label = document.createElement('div'); label.className = 'force-label';
  arrow.appendChild(shaft); arrow.appendChild(head); arrow.appendChild(label);

  massContainer.appendChild(hookTop);
  massContainer.appendChild(hook);
  massContainer.appendChild(mass);
  massContainer.appendChild(arrow);
  return massContainer;
}

// (Optional) programmatic create; not used by storage drag
function createMass(value) {
  const node = createMassElement(value);
  node.dataset.id = massCounter;
  node.dataset.position = 0;

  document.getElementById('beam').appendChild(node);

  const spacing = getInsetSpacingPx();
  node.style.left = `calc(50% + ${0 * spacing}px)`;
  node.style.top  = '50px';
  node.style.transform = ''; // let CSS counter-rotation apply

  node.addEventListener('pointerdown', startDrag, { passive: false });

  masses.push({ id: massCounter, position: 0, value, element: node });
  massCounter++;
  updateBeamBalance();
  updateMassCount();
  updateForceArrows();     // NEW
  updateMomentFeedback();
}

// -----------------------------------------------------
// Drag creation from storage (pointer events)
// -----------------------------------------------------
function startCreateDrag(e) {
  e.preventDefault();
  const value = parseInt(e.currentTarget.dataset.value, 10);

  const node = createMassElement(value);
  draggedMass = node;
  originalParent = document.getElementById('beam');
  nextSibling = null;

  document.body.appendChild(node);

  // While dragging, remove counter-rotation and use viewport coords
  node.style.transform = 'none';
  node.style.position = 'fixed';
  node.style.zIndex = '1000';
  node.style.bottom = ''; // fixed + bottom don't mix

  // Center under finger
  const rect = node.getBoundingClientRect();
  dragOffset.x = rect.width / 2;
  dragOffset.y = rect.height / 2;
  node.style.left = `${e.clientX - dragOffset.x}px`;
  node.style.top  = `${e.clientY - dragOffset.y}px`;

  // Document-level listeners (safer cross-browser for newly created node)
  document.addEventListener('pointermove', drag, { passive: false });
  document.addEventListener('pointerup', endDrag, { passive: false });
  document.addEventListener('pointercancel', cancelDrag, { passive: false });

  document.querySelectorAll('.drop-zone').forEach(z => z.classList.add('active'));
}

// -----------------------------------------------------
// Start drag for an existing mass on the beam (pointer events)
// -----------------------------------------------------
function startDrag(e) {
  const container = e.target.closest('.mass-container');
  if (!container) return;
  e.preventDefault();

  draggedMass = container;
  draggedMass.classList.add('dragging');

  const massId = parseInt(draggedMass.dataset.id, 10);
  const massObj = masses.find(m => m.id === massId);
  draggedMass.dataset.originalPosition = massObj ? massObj.position : 0;

  const rect = draggedMass.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;

  originalParent = draggedMass.parentNode;
  nextSibling = draggedMass.nextSibling;

  activePointerId = e.pointerId;
  try { draggedMass.setPointerCapture(activePointerId); } catch (_) {}

  // Freeze size to avoid reflow jump
  draggedMass.style.width = `${rect.width}px`;
  draggedMass.style.height = `${rect.height}px`;

  // Move to <body> so it’s not inside a rotated container
  document.body.appendChild(draggedMass);

  draggedMass.style.position = 'fixed';
  draggedMass.style.left = `${e.clientX - dragOffset.x}px`;
  draggedMass.style.top  = `${e.clientY - dragOffset.y}px`;
  draggedMass.style.bottom = '';
  draggedMass.style.transform = 'none';
  draggedMass.style.zIndex = '1000';

  // Also add document-level listeners
  document.addEventListener('pointermove', drag, { passive: false });
  document.addEventListener('pointerup', endDrag, { passive: false });
  document.addEventListener('pointercancel', cancelDrag, { passive: false });

  document.querySelectorAll('.drop-zone').forEach(z => z.classList.add('active'));
}

// -----------------------------------------------------
// Drag move
// -----------------------------------------------------
function drag(e) {
  if (!draggedMass) return;
  if (activePointerId !== null && e.pointerId !== activePointerId) return;
  e.preventDefault(); // stops page from scrolling on touch
  draggedMass.style.left = `${e.clientX - dragOffset.x}px`;
  draggedMass.style.top  = `${e.clientY - dragOffset.y}px`;
}

// -----------------------------------------------------
// Helpers for Basic mode (limit one mass per side)
// -----------------------------------------------------
function sideOf(pos) {
  if (pos < 0) return 'left';
  if (pos > 0) return 'right';
  return 'center';
}
function countOnSide(side, excludeId = null) {
  return masses.reduce((n, m) => {
    if (excludeId !== null && m.id === excludeId) return n;
    if (side === 'left'  && m.position < 0) return n + 1;
    if (side === 'right' && m.position > 0) return n + 1;
    return n;
  }, 0);
}

// -----------------------------------------------------
// End drag (snap, enforce basic-mode limit, cleanup)
// -----------------------------------------------------
function endDrag(e) {
  if (!draggedMass || (e && activePointerId !== null && e.pointerId !== activePointerId)) return;
  const node = draggedMass;

  // Geometry
  const beam = document.getElementById('beam');
  const br = beam.getBoundingClientRect();

  const massRect = node.getBoundingClientRect();
  const mCX = massRect.left + massRect.width / 2;
  const mCY = massRect.top  + massRect.height / 2;

  const H_MARGIN = 40, V_MARGIN_TOP = 160, V_MARGIN_BOTTOM = 240;
  const xWithin = (mCX >= br.left - H_MARGIN) && (mCX <= br.right + H_MARGIN);
  const yWithin = (mCY >= br.top - V_MARGIN_TOP) && (mCY <= br.bottom + V_MARGIN_BOTTOM);
  const canSnap = xWithin && yWithin;

  const isNew = !node.dataset.id;
  const existingId = isNew ? null : parseInt(node.dataset.id, 10);
  const massObj = isNew ? null : masses.find(m => m.id === existingId);
  const originalPos = isNew ? 0 :
    parseInt(node.dataset.originalPosition || String(massObj?.position || 0), 10);

  // Avoid 1-frame flash
  node.style.visibility = 'hidden';
  node.style.left = '';
  node.style.top  = '';

  if (!originalParent) originalParent = beam;

  const spacingPx = getInsetSpacingPx();

  if (canSnap) {
    if (nextSibling && originalParent) originalParent.insertBefore(node, nextSibling);
    else if (originalParent) originalParent.appendChild(node);

    node.style.position = 'absolute';
    node.style.zIndex = '10';
    node.style.top = '50px';     // top-based layout
    node.style.transform = '';   // CSS counter-rotation applies

    let position = Math.round((mCX - (br.left + br.width / 2)) / spacingPx);
    position = Math.max(-12, Math.min(12, position));

    // Basic mode limit (only 1 per side)
    if (!advancedMode) {
      const targetSide = sideOf(position);
      if (targetSide !== 'center') {
        const existingCount = countOnSide(
          targetSide,
          isNew ? null : (massObj ? massObj.id : null)
        );
        if (existingCount >= 1) {
          // Reject the drop
          if (isNew) {
            node.remove();
          } else {
            if (nextSibling && originalParent) originalParent.insertBefore(node, nextSibling);
            else if (originalParent) originalParent.appendChild(node);

            node.style.position = 'absolute';
            node.style.zIndex = '10';
            node.style.top = '50px';
            node.style.transform = '';
            node.style.left = `calc(50% + ${originalPos * spacingPx}px)`;
            node.dataset.position = originalPos;
            if (massObj) massObj.position = originalPos;
          }

          // Brief warning ONLY on rejection
          const bs = document.getElementById('balanceStatus');
          if (bs) {
            const prev = bs.textContent;
            bs.textContent = 'Basic mode: only one mass per side';
            setTimeout(() => { updateBeamBalance(); }, 900);
          }

          requestAnimationFrame(() => { if (node && node.style) node.style.visibility = 'visible'; });
          return finishCleanup(node);
        }
      }
    }

    // Accept the drop
    node.style.left = `calc(50% + ${position * spacingPx}px)`;
    node.dataset.position = position;

    if (isNew) {
      const id = massCounter++;
      node.dataset.id = String(id);
      const value = parseInt(node.dataset.value, 10);
      masses.push({ id, position, value, element: node });
      node.addEventListener('pointerdown', startDrag, { passive: false });
    } else if (massObj) {
      massObj.position = position;
    }
  } else {
    // Not near the beam → remove or revert
    if (isNew) {
      node.remove();
      return finishCleanup(node);
    } else {
      if (nextSibling && originalParent) originalParent.insertBefore(node, nextSibling);
      else if (originalParent) originalParent.appendChild(node);

      node.style.position = 'absolute';
      node.style.zIndex = '10';
      node.style.top = '50px';
      node.style.transform = '';
      node.style.left = `calc(50% + ${originalPos * spacingPx}px)`;
      node.dataset.position = originalPos;
      if (massObj) massObj.position = originalPos;
    }
  }

  requestAnimationFrame(() => { if (node && node.style) node.style.visibility = 'visible'; });
  finishCleanup(node);
}

function cancelDrag(e) {
  endDrag(e);
}

function finishCleanup(node) {
  try { if (activePointerId !== null) node.releasePointerCapture(activePointerId); } catch (_) {}
  node.classList.remove('dragging');
   node.style.width = '';   // NEW
  node.style.height = '';  // NEW

  draggedMass = null;
  originalParent = null;
  nextSibling = null;
  activePointerId = null;

  document.removeEventListener('pointermove', drag);
  document.removeEventListener('pointerup', endDrag);
  document.removeEventListener('pointercancel', cancelDrag);

  document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('active'));

  updateBeamBalance();
  updateMassCount();
  updateForceArrows();     // NEW
  updateMomentFeedback();
}

// -----------------------------------------------------
// Beam physics + UI
// -----------------------------------------------------
function updateBeamBalance() {
  let leftMoment = 0;
  let rightMoment = 0;

  // Keep physics unchanged (moment ~= mass × position)
  masses.forEach(mass => {
    const moment = mass.position * mass.value;
    if (mass.position < 0) leftMoment += Math.abs(moment);
    else if (mass.position > 0) rightMoment += moment;
  });

  const totalMoment = rightMoment - leftMoment;
  const maxRotation = 15;
  const rotation = Math.max(-maxRotation, Math.min(maxRotation, totalMoment));

  const beam = document.getElementById('beam');
  beam.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
  beam.style.setProperty('--counter-rot', `${-rotation}deg`);

  const balanceStatus = document.getElementById('balanceStatus');
  if (Math.abs(totalMoment) < 0.1) {
    balanceStatus.textContent = "Balanced!";
    balanceStatus.className = "balance-status balanced";
  } else if (totalMoment > 0) {
    balanceStatus.textContent = "Clockwise Resultant";
    balanceStatus.className = "balance-status unbalanced";
  } else {
    balanceStatus.textContent = "Anti-clockwise Resultant";
    balanceStatus.className = "balance-status unbalanced";
  }

  // Keep moment input feedback in sync
  updateMomentFeedback();
}

// Results numbers (now force totals, not mass)
function updateMassCount() {
  let leftForce = 0, rightForce = 0;

  masses.forEach(m => {
    const F = m.value * 10; // 10 N per kg
    if (m.position < 0) leftForce += F;
    else if (m.position > 0) rightForce += F;
  });

  // These inputs remain in your table
  const leftTotal = document.getElementById('leftTotalMass');
  const rightTotal = document.getElementById('rightTotalMass');
  if (leftTotal)  leftTotal.value  = leftForce;
  if (rightTotal) rightTotal.value = rightForce;
}


function clearAll() {
  masses.forEach(m => m.element.remove());
  masses = [];
  massCounter = 1;
  updateBeamBalance();
  updateMassCount();
  updateForceArrows();
  updateMomentFeedback();
}

// -----------------------------------------------------
// Force arrows (length & label)
// -----------------------------------------------------
function updateForceArrows() {
  masses.forEach(m => {
    const node = m.element;
    let arrow = node.querySelector('.force-arrow');
    if (!arrow) {
      // If a mass came from older code without an arrow, add one
      arrow = document.createElement('div'); arrow.className = 'force-arrow';
      const shaft = document.createElement('div'); shaft.className = 'force-shaft';
      const head  = document.createElement('div'); head.className  = 'force-head';
      const label = document.createElement('div'); label.className = 'force-label';
      arrow.appendChild(shaft); arrow.appendChild(head); arrow.appendChild(label);
      node.appendChild(arrow);
    }
    const N = m.value * GRAVITY_N_PER_KG;
    const shaftEl = arrow.querySelector('.force-shaft');
    const labelEl = arrow.querySelector('.force-label');

    const h = Math.max(ARROW_MIN_PX, Math.min(ARROW_MAX_PX, N * ARROW_PX_PER_NEWTON));
    shaftEl.style.height = `${h}px`;
    labelEl.textContent = `${N} N`;
  });
}

// -----------------------------------------------------
// Moment feedback (✓ / ✗) — uses Force × distance now
// -----------------------------------------------------
function getExpectedMoments() {
  let left = 0, right = 0;
  masses.forEach(m => {
    const F = m.value * GRAVITY_N_PER_KG; // convert mass to force
    const contrib = Math.abs(m.position) * F;
    if (m.position < 0) left  += contrib;
    else if (m.position > 0) right += contrib;
  });
  return { left, right };
}

function setInputFeedback(inputEl, state) {
  if (!inputEl) return;
  const td = inputEl.parentNode;
  let mark = td.querySelector('.feedback-mark');
  if (!mark) {
    mark = document.createElement('span');
    mark.className = 'feedback-mark';
    td.appendChild(mark);
  }
  inputEl.classList.remove('answer-correct', 'answer-incorrect');
  mark.classList.remove('correct', 'incorrect');
  mark.textContent = '';

  if (state === true) {
    inputEl.classList.add('answer-correct');
    mark.classList.add('correct');
    mark.textContent = '✓';
  } else if (state === false) {
    inputEl.classList.add('answer-incorrect');
    mark.classList.add('incorrect');
    mark.textContent = '✗';
  }
}

function updateMomentFeedback() {
  const { left, right } = getExpectedMoments();
  const leftInput  = document.getElementById('leftMoment');
  const rightInput = document.getElementById('rightMoment');
  const tol = 1e-6;

  if (leftInput) {
    const txt = leftInput.value.trim();
    if (txt === '') setInputFeedback(leftInput, null);
    else {
      const v = Number(txt);
      setInputFeedback(leftInput, Number.isFinite(v) && Math.abs(v - left) <= tol);
    }
  }
  if (rightInput) {
    const txt = rightInput.value.trim();
    if (txt === '') setInputFeedback(rightInput, null);
    else {
      const v = Number(txt);
      setInputFeedback(rightInput, Number.isFinite(v) && Math.abs(v - right) <= tol);
    }
  }
}

// -----------------------------------------------------
// Results table headings (rename to Force / Force×distance)
// -----------------------------------------------------
function updateResultsTableHeadings() {
  const ths = document.querySelectorAll('.data-table thead th');
  // After removing the column, we expect 4 columns:
  // 0: Side | 1: Total Force (N) | 2: Distance | 3: Moment (Force × Distance)
  if (ths.length === 4) {
    ths[1].textContent = 'Total Force (N)';
    ths[3].textContent = 'Moment (Force × Distance)';
  } else if (ths.length === 5) {
    // Fallback if column wasn't removed for some reason
    ths[2].textContent = 'Total Force (N)';
    ths[4].textContent = 'Moment (Force × Distance)';
  }
}


// -----------------------------------------------------
// Boot + resize
// -----------------------------------------------------
document.addEventListener('DOMContentLoaded', init);

window.addEventListener('resize', () => {
  createScale();
  createDropZones();
  const spacing = getInsetSpacingPx();
  masses.forEach(m => {
    m.element.style.left = `calc(50% + ${m.position * spacing}px)`;
    m.element.style.top  = '50px';   // top-based layout
    m.element.style.transform = '';  // let CSS (counter-rotation) apply
  });
  updateBeamBalance();
  updateForceArrows();
  updateMomentFeedback();
});
