/* === C&OPZ v4.1 — Messages === */

const Messages = {
  STORAGE_KEY: 'copz_messages_v4',

  defaults: {
    c1p1: 'Tanti auguri',
    c1p2: 'per il tuo compleanno! 🎂',
    c2p1: 'Buon compleanno',
    c2p2: '! Che sia un anno pieno di gioia! 🎉',
    c3p1: 'Auguri',
    c3p2: '! Spero tu possa festeggiare alla grande! 🥳',
    dp1: 'In ricordo di',
    dp2: '. Oggi ci manchi. 🕯️',
    o1p1: 'Buon onomastico',
    o1p2: '! 🎊',
    o2p1: 'Tanti auguri di buon onomastico',
    o2p2: '! 🌟',
    o3p1: 'Felice onomastico',
    o3p2: '! 🎈',
    o4p1: 'Augurissimi per il tuo onomastico',
    o4p2: '! 🥂',
    o5p1: 'Buona festa del nome',
    o5p2: '! 🎁',
    signature: ''
  },

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? { ...this.defaults, ...JSON.parse(raw) } : { ...this.defaults };
    } catch { return { ...this.defaults }; }
  },

  save(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
    return { ...this.defaults };
  },

  // Rotazione per tipo: usa un contatore in localStorage per ciclare varianti
  getVariant(type, totalVariants) {
    const key = 'copz_rot_' + type;
    let idx = parseInt(localStorage.getItem(key) || '0', 10);
    const variant = idx % totalVariants;
    localStorage.setItem(key, String((idx + 1) % 1000));
    return variant;
  },

  build(msgData, type, name, isDead = false) {
    const sig = msgData.signature ? ('\n\n' + msgData.signature) : '';
    if (isDead) {
      return (msgData.dp1 + ' ' + name + ' ' + msgData.dp2).trim() + sig;
    }
    if (type === 'birthday') {
      const v = this.getVariant('birthday', 3);
      const p1 = msgData['c' + (v + 1) + 'p1'];
      const p2 = msgData['c' + (v + 1) + 'p2'];
      return (p1 + ' ' + name + ' ' + p2).trim() + sig;
    }
    if (type === 'onomastico') {
      const v = this.getVariant('onomastico', 5);
      const p1 = msgData['o' + (v + 1) + 'p1'];
      const p2 = msgData['o' + (v + 1) + 'p2'];
      return (p1 + ' ' + name + ' ' + p2).trim() + sig;
    }
    return '';
  },

  getVariantLabel(type) {
    if (type === 'birthday') {
      const v = (parseInt(localStorage.getItem('copz_rot_birthday') || '0', 10) % 3) + 1;
      return 'Variante ' + v + '/3';
    }
    if (type === 'onomastico') {
      const v = (parseInt(localStorage.getItem('copz_rot_onomastico') || '0', 10) % 5) + 1;
      return 'Variante ' + v + '/5';
    }
    return '';
  }
};
