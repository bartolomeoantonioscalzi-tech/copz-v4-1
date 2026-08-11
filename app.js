/* === C&OPZ v4.1 — App === */

(function() {
  'use strict';

  // --- State ---
  let vcfContacts = [];
  let onomastici = [];
  let msgData = Messages.load();
  let today = new Date();
  let yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  let tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  // --- DOM refs ---
  const $ = id => document.getElementById(id);
  const els = {
    vcfFile: $('vcf-file'), csvFile: $('csv-file'), csvEncoding: $('csv-encoding'),
    vcfStatus: $('vcf-status'), csvStatus: $('csv-status'),
    btnProcess: $('btn-process'), btnClear: $('btn-clear'),
    tabs: $('tabs'),
    dateOggi: $('date-oggi'), dateAnticipati: $('date-anticipati'), dateDomani: $('date-domani'),
    countOggi: $('count-oggi'), countAnticipati: $('count-anticipati'), countDomani: $('count-domani'),
    sentOggi: $('sent-oggi'),
    listOggi: $('list-oggi'), listAnticipati: $('list-anticipati'), listDomani: $('list-domani'),
    tmplContact: $('tmpl-contact'),
    antiBanToggle: $('anti-ban-toggle')
  };

  // --- Init ---
  function init() {
    setupTabs();
    setupUpload();
    setupEditor();
    updateDates();
    loadFromStorage();
    renderAll();
  }

  function updateDates() {
    const fmt = d => d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    els.dateOggi.textContent = fmt(today);
    els.dateAnticipati.textContent = fmt(yesterday);
    els.dateDomani.textContent = fmt(tomorrow);
  }

  // --- Tabs ---
  function setupTabs() {
    els.tabs.addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  }

  // --- Upload ---
  function setupUpload() {
    els.vcfFile.addEventListener('change', () => {
      els.vcfStatus.textContent = els.vcfFile.files[0]?.name || 'Nessun file';
    });
    els.csvFile.addEventListener('change', () => {
      els.csvStatus.textContent = els.csvFile.files[0]?.name || 'Nessun file';
    });
    els.btnProcess.addEventListener('click', processFiles);
    els.btnClear.addEventListener('click', clearData);
  }

  async function processFiles() {
    const vcfFile = els.vcfFile.files[0];
    const csvFile = els.csvFile.files[0];
    if (!vcfFile && !csvFile) { alert('Carica almeno un file VCF o CSV'); return; }

    if (vcfFile) {
      const text = await vcfFile.text();
      vcfContacts = Parser.parseVCF(text);
      els.vcfStatus.textContent = `${vcfContacts.length} contatti`;
    }
    if (csvFile) {
      const enc = els.csvEncoding.value;
      onomastici = await Parser.parseCSV(csvFile, enc);
      els.csvStatus.textContent = `${onomastici.length} onomastici`;
    }

    saveToStorage();
    renderAll();
  }

  function clearData() {
    vcfContacts = [];
    onomastici = [];
    els.vcfFile.value = '';
    els.csvFile.value = '';
    els.vcfStatus.textContent = 'Nessun file';
    els.csvStatus.textContent = 'Nessun file';
    localStorage.removeItem('copz_vcf');
    localStorage.removeItem('copz_csv');
    renderAll();
  }

  // --- Storage ---
  function saveToStorage() {
    localStorage.setItem('copz_vcf', JSON.stringify(vcfContacts));
    localStorage.setItem('copz_csv', JSON.stringify(onomastici));
  }

  function loadFromStorage() {
    try {
      const vcf = localStorage.getItem('copz_vcf');
      const csv = localStorage.getItem('copz_csv');
      if (vcf) vcfContacts = JSON.parse(vcf);
      if (csv) onomastici = JSON.parse(csv);
      if (vcfContacts.length) els.vcfStatus.textContent = `${vcfContacts.length} contatti (memoria)`;
      if (onomastici.length) els.csvStatus.textContent = `${onomastici.length} onomastici (memoria)`;
    } catch {}
  }

  // --- Elaborazione giorni ---
  function getDayData(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const isToday = date.toDateString() === today.toDateString();
    const items = [];

    for (const c of vcfContacts) {
      // Compleanno
      if (Matcher.matchCompleanno(c, m, d)) {
        items.push({
          contact: c,
          type: c.isDead && isToday ? 'dead' : 'birthday',
          name: c.fullname || (c.name + ' ' + c.surname).trim(),
          phone: c.phones[0] || '',
          isDead: c.isDead
        });
      }
      // Onomastico (solo se non è già un compleanno per lo stesso contatto)
      else {
        const o = Matcher.matchOnomastico(c, onomastici);
        if (o && o.month === m && o.day === d) {
          items.push({
            contact: c,
            type: 'onomastico',
            name: c.fullname || (c.name + ' ' + c.surname).trim(),
            phone: c.phones[0] || '',
            onomasticoName: o.name
          });
        }
      }
    }

    // Ordina: compleanni prima, poi onomastici, poi dead
    const order = { birthday: 0, dead: 1, onomastico: 2 };
    items.sort((a, b) => order[a.type] - order[b.type]);
    return items;
  }

  // --- Rendering ---
  function renderAll() {
    const oggi = getDayData(today);
    const anticipati = getDayData(yesterday);
    const domani = getDayData(tomorrow);

    renderList(els.listOggi, oggi, 'oggi');
    renderList(els.listAnticipati, anticipati, 'anticipati');
    renderList(els.listDomani, domani, 'domani');

    els.countOggi.textContent = oggi.length;
    els.countAnticipati.textContent = anticipati.length;
    els.countDomani.textContent = domani.length;

    updateSentBadge(oggi, 'oggi');
  }

  function renderList(container, items, dayKey) {
    container.innerHTML = '';
    if (!items.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">Nessun contatto per questa giornata.</p>';
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const clone = els.tmplContact.content.cloneNode(true);
      const card = clone.querySelector('.contact-card');
      card.dataset.id = `${dayKey}_${i}`;
      card.classList.add('type-' + item.type);

      // Avatar
      const avatar = clone.querySelector('.contact-avatar');
      avatar.textContent = item.type === 'birthday' ? '🎂' : item.type === 'dead' ? '🕯️' : '📛';

      // Info
      clone.querySelector('.contact-name').textContent = item.name;
      const detail = item.type === 'birthday' ? 'Compleanno' : item.type === 'dead' ? 'Commemorazione' : 'Onomastico (' + (item.onomasticoName || '') + ')';
      clone.querySelector('.contact-detail').textContent = detail;
      clone.querySelector('.contact-phone').textContent = formatPhone(item.phone);

      // Preview
      const preview = clone.querySelector('.preview-text');
      const variant = clone.querySelector('.preview-variant');
      const msg = Messages.build(msgData, item.type === 'dead' ? 'birthday' : item.type, item.name, item.isDead);
      preview.textContent = msg;
      variant.textContent = Messages.getVariantLabel(item.type === 'dead' ? 'birthday' : item.type);

      // Actions
      const phone = normalizePhone(item.phone);
      clone.querySelector('.btn-tg').onclick = () => sendMsg('tg', phone, msg, card);
      clone.querySelector('.btn-wa').onclick = () => sendMsg('wa', phone, msg, card);
      clone.querySelector('.btn-sms').onclick = () => sendMsg('sms', phone, msg, card);

      // Status
      const statusBadge = clone.querySelector('.status-badge');
      if (isSent(dayKey, i)) {
        card.classList.add('sent');
        statusBadge.textContent = '✓ Inviato';
        statusBadge.classList.add('sent');
      } else {
        statusBadge.textContent = 'Da inviare';
      }

      container.appendChild(clone);
    }
  }

  function formatPhone(p) {
    if (!p) return '—';
    if (p.startsWith('+39') && p.length > 10) return '+39 ' + p.slice(3, 6) + ' ' + p.slice(6, 9) + ' ' + p.slice(9);
    if (p.startsWith('3') && p.length === 10) return p.slice(0, 3) + ' ' + p.slice(3, 6) + ' ' + p.slice(6);
    return p;
  }

  function normalizePhone(p) {
    if (!p) return '';
    let clean = p.replace(/[^0-9+]/g, '');
    if (clean.startsWith('+')) return clean;
    if (clean.startsWith('00')) return '+' + clean.slice(2);
    if (clean.startsWith('3')) return '+39' + clean;
    return clean;
  }

  // --- Invio ---
  let antiBanQueue = [];
  let antiBanTimer = null;

  function sendMsg(platform, phone, text, cardEl) {
    if (!phone) { alert('Nessun numero di telefono'); return; }
    const antiBan = els.antiBanToggle.checked;

    if (antiBan) {
      antiBanQueue.push({ platform, phone, text, cardEl });
      if (!antiBanTimer) processQueue();
    } else {
      doSend(platform, phone, text, cardEl);
    }
  }

  function processQueue() {
    if (!antiBanQueue.length) { antiBanTimer = null; return; }
    const { platform, phone, text, cardEl } = antiBanQueue.shift();
    doSend(platform, phone, text, cardEl);
    antiBanTimer = setTimeout(processQueue, 2000);
  }

  function doSend(platform, phone, text, cardEl) {
    let url = '';
    if (platform === 'tg') {
      url = `tg://msg?to=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;
    } else if (platform === 'wa') {
      url = `https://wa.me/${phone.replace(/\+/g, '')}?text=${encodeURIComponent(text)}`;
    } else if (platform === 'sms') {
      url = `sms:${phone}?body=${encodeURIComponent(text)}`;
    }
    window.open(url, '_blank');

    // Mark sent
    const id = cardEl.dataset.id;
    if (id) markSent(id);
    const badge = cardEl.querySelector('.status-badge');
    if (badge) { badge.textContent = '✓ Inviato'; badge.classList.add('sent'); }
    cardEl.classList.add('sent');
    updateSentBadgeFromDOM();
  }

  // --- Stato invio ---
  function getSentKey() {
    return 'copz_sent_' + today.toISOString().slice(0, 10);
  }

  function isSent(dayKey, index) {
    try {
      const data = JSON.parse(localStorage.getItem(getSentKey()) || '{}');
      return !!data[`${dayKey}_${index}`];
    } catch { return false; }
  }

  function markSent(id) {
    try {
      const key = getSentKey();
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      data[id] = true;
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  }

  function updateSentBadge(items, dayKey) {
    let sent = 0;
    for (let i = 0; i < items.length; i++) {
      if (isSent(dayKey, i)) sent++;
    }
    els.sentOggi.textContent = sent + ' inviati';
    els.sentOggi.style.display = sent > 0 ? 'inline' : 'none';
  }

  function updateSentBadgeFromDOM() {
    const sent = document.querySelectorAll('#list-oggi .contact-card.sent').length;
    els.sentOggi.textContent = sent + ' inviati';
    els.sentOggi.style.display = sent > 0 ? 'inline' : 'none';
  }

  // --- Editor messaggi ---
  function setupEditor() {
    const fields = ['c1p1','c1p2','c2p1','c2p2','c3p1','c3p2','dp1','dp2','o1p1','o1p2','o2p1','o2p2','o3p1','o3p2','o4p1','o4p2','o5p1','o5p2','signature'];
    for (const f of fields) {
      const el = $('msg-' + f);
      if (el) el.value = msgData[f] || '';
    }

    $('btn-save-msg').addEventListener('click', () => {
      for (const f of fields) {
        const el = $('msg-' + f);
        if (el) msgData[f] = el.value;
      }
      Messages.save(msgData);
      alert('Messaggi salvati!');
      renderAll();
    });

    $('btn-reset-msg').addEventListener('click', () => {
      if (!confirm('Ripristinare i messaggi predefiniti?')) return;
      msgData = Messages.reset();
      for (const f of fields) {
        const el = $('msg-' + f);
        if (el) el.value = msgData[f] || '';
      }
      renderAll();
    });
  }

  // --- Start ---
  init();
})();
