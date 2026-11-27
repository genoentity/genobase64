/* UI-Logik. Keine fetches, keine externen Requests – alles bleibt im Browser. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ui = {
    input: $('input'), output: $('output'),
    inputCount: $('inputCount'), outputCount: $('outputCount'),
    hint: $('inputHint'), byteInfo: $('byteInfo'),
    flowLabel: $('flowLabel'), flowDetail: $('flowDetail'),
    nodeFrom: $('nodeFrom'), nodeTo: $('nodeTo'),
    statusText: $('statusText'), statusDot: $('statusDot'),
    copyBtn: $('copyBtn'), copyLabel: $('copyLabel'),
    clearBtn: $('clearBtn'), swapBtn: $('swapBtn'),
    urlSafe: $('urlSafe'), toast: $('toast'),
    installBtn: $('installBtn'), installHint: $('installHint')
  };

  const state = { mode: 'auto' };
  const utf8 = new TextEncoder();
  let toastTimer = null;
  let deferredPrompt = null;

  function chars(count) { return count + ' Zeichen'; }

  function render() {
    const value = ui.input.value;
    const result = window.NeonB64.convert(value, state.mode, { urlSafe: ui.urlSafe.checked });

    ui.output.value = result.output;
    ui.inputCount.textContent = chars(value.length);
    ui.outputCount.textContent = chars(result.output.length);
    ui.byteInfo.textContent = utf8.encode(value).length + ' B → ' + utf8.encode(result.output).length + ' B';

    const dir = result.direction;
    ui.nodeFrom.textContent = dir === 'decode' ? 'BASE64' : 'TEXT';
    ui.nodeTo.textContent = dir === 'decode' ? 'TEXT' : 'BASE64';
    ui.nodeFrom.classList.toggle('is-active', !!dir && !result.error);
    ui.nodeTo.classList.toggle('is-active', !!dir && !result.error);
    ui.nodeTo.classList.toggle('node-accent', dir !== 'decode');

    ui.flowLabel.textContent = state.mode === 'auto' ? (dir ? 'AUTO · ERKANNT' : 'AUTO') : 'MANUELL';
    ui.flowDetail.textContent = state.mode === 'auto'
      ? (dir === 'decode' ? 'Base64 erkannt → dekodiert' : dir === 'encode' ? 'Klartext erkannt → kodiert' : 'Auto-Erkennung aktiv')
      : (state.mode === 'encode' ? 'Text wird kodiert' : 'Base64 wird dekodiert');

    ui.hint.className = 'hint';
    if (result.error) {
      ui.hint.textContent = result.error;
      ui.hint.classList.add('is-error');
      ui.statusText.textContent = 'Umwandlung nicht möglich';
      ui.statusDot.className = 'status-dot is-error';
    } else if (result.empty) {
      ui.hint.textContent = 'Tippe oder füge etwas ein.';
      ui.statusText.textContent = navigator.onLine ? 'Bereit – alles bleibt auf diesem Gerät' : 'Offline – keine Verbindung nötig';
      ui.statusDot.className = 'status-dot is-idle';
    } else {
      ui.hint.textContent = dir === 'decode' ? 'Base64 erkannt und dekodiert.' : 'Text wird live kodiert.';
      ui.hint.classList.add('is-ok');
      ui.statusText.textContent = navigator.onLine ? 'Live · 100 % lokal im Browser' : 'Offline · 100 % lokal im Browser';
      ui.statusDot.className = 'status-dot';
    }

    ui.copyBtn.disabled = !result.output;
    ui.copyLabel.textContent = 'Kopieren';
  }

  function toast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { ui.toast.classList.remove('is-visible'); }, 2200);
  }

  async function copyOutput() {
    const text = ui.output.value;
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        ui.output.focus();
        ui.output.select();
        const ok = document.execCommand('copy');
        if (!ok) throw new Error('Kopieren blockiert');
      }
      ui.copyLabel.textContent = 'Kopiert';
      toast('Ergebnis kopiert');
    } catch (error) {
      toast('Kopieren nicht möglich – bitte manuell markieren');
    }
  }

  document.querySelectorAll('.mode').forEach(function (button) {
    button.addEventListener('click', function () {
      state.mode = button.dataset.mode;
      document.querySelectorAll('.mode').forEach(function (other) {
        const active = other === button;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });
      render();
    });
  });

  ui.input.addEventListener('input', render);
  ui.urlSafe.addEventListener('change', render);
  ui.clearBtn.addEventListener('click', function () { ui.input.value = ''; render(); ui.input.focus(); });
  ui.swapBtn.addEventListener('click', function () {
    if (!ui.output.value) return;
    ui.input.value = ui.output.value;
    render();
    ui.input.focus();
    toast('Ergebnis übernommen');
  });
  ui.copyBtn.addEventListener('click', copyOutput);

  document.addEventListener('keydown', function (event) {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key === 'k' || event.key === 'K') {
      event.preventDefault();
      ui.input.focus();
      ui.input.select();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      copyOutput();
    }
  });

  window.addEventListener('online', render);
  window.addEventListener('offline', render);

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    ui.installBtn.hidden = false;
    ui.installHint.hidden = true;
  });
  ui.installBtn.addEventListener('click', async function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    ui.installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    ui.installBtn.hidden = true;
    ui.installHint.hidden = true;
    toast('App installiert');
  });

  const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  if (!standalone) setTimeout(function () { if (!deferredPrompt) ui.installHint.hidden = false; }, 1600);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* Offline-Nutzung ohne SW weiterhin möglich */ });
    });
  }

  render();
})();
