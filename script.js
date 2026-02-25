/* ===== FUNKY CALC — script.js ===== */

(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────
  let displayValue  = '0';
  let operator      = null;
  let firstOperand  = null;
  let waitingForSecond = false;
  let soundOn       = true;
  let easterBuffer  = '';

  // ─── DOM Refs ────────────────────────────────────────────────────────────
  const exprEl      = document.getElementById('display-expression');
  const resultEl    = document.getElementById('display-result');
  const container   = document.getElementById('calc-container');
  const confettiBox = document.getElementById('confetti-container');
  const soundBtn    = document.getElementById('sound-toggle');
  const easterEgg   = document.getElementById('easter-egg');
  const titleEl     = document.getElementById('title');

  // ─── Particles ───────────────────────────────────────────────────────────
  (function spawnParticles() {
    const colors = ['#ff006e','#3a86ff','#8aff00','#9b00ff','#ff6d00','#00f5ff','#ffe600','#39ff14'];
    const box    = document.getElementById('particles-container');
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size   = 4 + Math.random() * 8;
      const color  = colors[Math.floor(Math.random() * colors.length)];
      const left   = Math.random() * 100;
      const dur    = 6 + Math.random() * 14;
      const delay  = -(Math.random() * 14);
      p.style.cssText = `
        width:${size}px; height:${size}px;
        background:${color};
        left:${left}%;
        bottom:0;
        animation-duration:${dur}s;
        animation-delay:${delay}s;
        box-shadow: 0 0 ${size * 2}px ${color};
      `;
      box.appendChild(p);
    }
  })();

  // ─── Display update ──────────────────────────────────────────────────────
  function updateDisplay(expr, subtext) {
    exprEl.textContent  = expr  || '0';
    resultEl.textContent = subtext || '';
  }

  // ─── Format number ───────────────────────────────────────────────────────
  function formatNum(n) {
    if (n === null || n === undefined) return '0';
    const s = String(n);
    if (s === 'Infinity' || s === '-Infinity') return '∞';
    if (isNaN(n)) return 'ERROR';
    // Limit decimal places for display
    const num = parseFloat(n);
    if (!isFinite(num)) return '∞';
    const formatted = parseFloat(num.toPrecision(10)).toString();
    return formatted;
  }

  // ─── Core calculate ──────────────────────────────────────────────────────
  function calculate(a, op, b) {
    a = parseFloat(a);
    b = parseFloat(b);
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/':
        if (b === 0) {
          shakeCalc();
          return Infinity;
        }
        return a / b;
    }
    return b;
  }

  // ─── Button handlers ─────────────────────────────────────────────────────
  function handleNumber(val) {
    if (waitingForSecond) {
      displayValue = val;
      waitingForSecond = false;
    } else {
      displayValue = displayValue === '0' ? val : displayValue + val;
    }
    // Easter egg
    easterBuffer += val;
    if (easterBuffer.length > 4) easterBuffer = easterBuffer.slice(-4);
    if (easterBuffer === '1337') triggerEasterEgg();

    updateDisplay(firstOperand !== null ? formatNum(firstOperand) + ' ' + opSymbol(operator) + ' ' + displayValue : displayValue);
  }

  function handleDecimal() {
    if (waitingForSecond) {
      displayValue = '0.';
      waitingForSecond = false;
    } else if (!displayValue.includes('.')) {
      displayValue += '.';
    }
    updateDisplay(firstOperand !== null ? formatNum(firstOperand) + ' ' + opSymbol(operator) + ' ' + displayValue : displayValue);
  }

  function handleOperator(op) {
    // If we already have a pending operation, evaluate it first
    if (firstOperand !== null && !waitingForSecond && operator) {
      const result = calculate(firstOperand, operator, displayValue);
      displayValue  = formatNum(result);
      firstOperand  = parseFloat(displayValue);
    } else {
      firstOperand = parseFloat(displayValue);
    }
    operator         = op;
    waitingForSecond = true;
    highlightOp(op);
    updateDisplay(formatNum(firstOperand) + ' ' + opSymbol(op), '');
  }

  function handleEquals() {
    if (operator === null || waitingForSecond) {
      updateDisplay(displayValue);
      return;
    }
    const result = calculate(firstOperand, operator, displayValue);
    const expr   = formatNum(firstOperand) + ' ' + opSymbol(operator) + ' ' + displayValue + ' =';
    displayValue  = formatNum(result);
    firstOperand  = null;
    operator      = null;
    waitingForSecond = false;
    clearActiveOp();
    updateDisplay(displayValue, expr);
    if (isFinite(result)) confettiBurst();
  }

  function handleClear() {
    displayValue     = '0';
    firstOperand     = null;
    operator         = null;
    waitingForSecond = false;
    easterBuffer     = '';
    clearActiveOp();
    updateDisplay('0', '');
  }

  function handleBackspace() {
    if (waitingForSecond) return;
    if (displayValue.length <= 1 || displayValue === '-0' || (displayValue.startsWith('-') && displayValue.length === 2)) {
      displayValue = '0';
    } else {
      const sliced = displayValue.slice(0, -1);
      displayValue = sliced === '-' ? '0' : sliced;
    }
    updateDisplay(firstOperand !== null ? formatNum(firstOperand) + ' ' + opSymbol(operator) + ' ' + displayValue : displayValue);
  }

  function handlePercent() {
    displayValue = formatNum(parseFloat(displayValue) / 100);
    updateDisplay(firstOperand !== null ? formatNum(firstOperand) + ' ' + opSymbol(operator) + ' ' + displayValue : displayValue);
  }

  function handleSign() {
    if (displayValue === '0') return;
    displayValue = displayValue.startsWith('-') ? displayValue.slice(1) : '-' + displayValue;
    updateDisplay(firstOperand !== null ? formatNum(firstOperand) + ' ' + opSymbol(operator) + ' ' + displayValue : displayValue);
  }

  // ─── Op symbol helper ────────────────────────────────────────────────────
  function opSymbol(op) {
    return { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] || op;
  }

  // ─── Highlight active operator ───────────────────────────────────────────
  function highlightOp(op) {
    clearActiveOp();
    document.querySelectorAll('.btn-op').forEach(btn => {
      if (btn.dataset.value === op) btn.classList.add('active');
    });
  }
  function clearActiveOp() {
    document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active'));
  }

  // ─── Ripple effect ───────────────────────────────────────────────────────
  function addRipple(btn, e) {
    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(btn.offsetWidth, btn.offsetHeight);
    const x      = (e.clientX - rect.left) - size / 2;
    const y      = (e.clientY - rect.top)  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    // Pulse wave
    const wave = document.createElement('div');
    wave.className = 'pulse-wave';
    btn.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove());
  }

  // ─── Shake calculator ────────────────────────────────────────────────────
  function shakeCalc() {
    container.classList.add('shake');
    container.addEventListener('animationend', () => container.classList.remove('shake'), { once: true });
  }

  // ─── Confetti burst ──────────────────────────────────────────────────────
  function confettiBurst() {
    const colors = ['#ff006e','#3a86ff','#8aff00','#9b00ff','#ff6d00','#00f5ff','#ffe600','#39ff14','#fff'];
    const shapes = ['circle', 'rect', 'triangle'];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const color  = colors[Math.floor(Math.random() * colors.length)];
      const left   = 10 + Math.random() * 80;
      const dur    = 0.8 + Math.random() * 1.5;
      const size   = 6 + Math.random() * 12;
      piece.style.cssText = `
        left:${left}%;
        top: -20px;
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration:${dur}s;
        animation-delay:${Math.random() * 0.3}s;
        box-shadow: 0 0 ${size}px ${color};
        transform: rotate(${Math.random() * 360}deg);
      `;
      confettiBox.appendChild(piece);
      piece.addEventListener('animationend', () => piece.remove());
    }
  }

  // ─── Audio context (simple beep) ─────────────────────────────────────────
  let audioCtx;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function playBeep(freq, type, duration) {
    if (!soundOn) return;
    try {
      const ctx  = getAudioCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type      = type || 'sine';
      osc.frequency.setValueAtTime(freq || 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (_e) { /* Audio not supported or blocked — ignore silently */ }
  }

  // ─── Easter egg ──────────────────────────────────────────────────────────
  function triggerEasterEgg() {
    easterEgg.classList.remove('hidden');
    shakeCalc();
    confettiBurst();
    confettiBurst();
    setTimeout(() => easterEgg.classList.add('hidden'), 5000);
  }

  // ─── Sound toggle ────────────────────────────────────────────────────────
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
  });

  // ─── Keyboard support ────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if ('0123456789'.includes(e.key)) return simulateClick(e.key, 'value');
    if (e.key === '.') return simulateClick('.', 'action', 'decimal');
    if (e.key === '+') return simulateClick('+', 'value');
    if (e.key === '-') return simulateClick('-', 'value');
    if (e.key === '*' || e.key === 'x') return simulateClick('*', 'value');
    if (e.key === '/') { e.preventDefault(); return simulateClick('/', 'value'); }
    if (e.key === 'Enter' || e.key === '=') return simulateClick(null, 'action', 'equals');
    if (e.key === 'Backspace') return simulateClick(null, 'action', 'backspace');
    if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') return simulateClick(null, 'action', 'clear');
    if (e.key === '%') return simulateClick(null, 'action', 'percent');
  });

  function simulateClick(val, attr, actionVal) {
    let btn;
    if (attr === 'value') {
      btn = document.querySelector(`.btn[data-value="${val}"]`);
    } else {
      btn = document.querySelector(`.btn[data-action="${actionVal}"]`);
    }
    if (btn) {
      btn.click();
      btn.classList.add('shake');
      setTimeout(() => btn.classList.remove('shake'), 200);
    }
  }

  // ─── Button click events ─────────────────────────────────────────────────
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      addRipple(btn, e);

      const val    = btn.dataset.value;
      const action = btn.dataset.action;

      if (val !== undefined) {
        // Number or operator
        if ('0123456789'.includes(val)) {
          handleNumber(val);
          playBeep(300 + parseInt(val) * 40, 'sine', 0.08);
        } else {
          handleOperator(val);
          playBeep(600, 'square', 0.1);
        }
      } else if (action) {
        switch (action) {
          case 'clear':
            handleClear();
            playBeep(200, 'sawtooth', 0.15);
            break;
          case 'decimal':
            handleDecimal();
            playBeep(880, 'sine', 0.07);
            break;
          case 'backspace':
            handleBackspace();
            playBeep(400, 'triangle', 0.08);
            break;
          case 'percent':
            handlePercent();
            playBeep(660, 'sine', 0.1);
            break;
          case 'sign':
            handleSign();
            playBeep(500, 'sine', 0.08);
            break;
          case 'equals':
            handleEquals();
            playBeep(880, 'sine', 0.05);
            setTimeout(() => playBeep(1100, 'sine', 0.05), 60);
            setTimeout(() => playBeep(1320, 'sine', 0.1),  120);
            break;
        }
      }
    });
  });

  // ─── Init display ────────────────────────────────────────────────────────
  updateDisplay('0');

})();
