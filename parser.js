/* === C&OPZ v4.1 — Parser === */

const Parser = {
  // --- VCF ---
  parseVCF(text) {
    const contacts = [];
    const cards = text.split(/BEGIN:VCARD/i).slice(1);
    for (const card of cards) {
      const lines = card.replace(/\r\n|\r/g, '\n').split('\n');
      const obj = { name: '', surname: '', fullname: '', phones: [], birthday: null, note: '', isDead: false };
      let i = 0;
      while (i < lines.length) {
        let line = lines[i];
        // unfold continuation lines
        while (i + 1 < lines.length && lines[i + 1].startsWith(' ')) {
          line += lines[i + 1].slice(1);
          i++;
        }
        const [keyPart, ...valParts] = line.split(':');
        const value = valParts.join(':');
        const key = keyPart.split(';')[0].toUpperCase();
        const params = keyPart.split(';').slice(1);

        if (key === 'FN') {
          obj.fullname = this.decodeQP(value, params);
        } else if (key === 'N') {
          const parts = this.decodeQP(value, params).split(';');
          obj.surname = parts[0] || '';
          obj.name = parts[1] || '';
        } else if (key === 'TEL') {
          const phone = value.replace(/[^0-9+]/g, '');
          if (phone) obj.phones.push(phone);
        } else if (key === 'BDAY') {
          obj.birthday = this.parseDate(value);
        } else if (key === 'NOTE') {
          obj.note = this.decodeQP(value, params);
          const noteLow = obj.note.toLowerCase();
          obj.isDead = noteLow.includes('morto') || noteLow.includes('morta') || noteLow.includes('defunto') || noteLow.includes('defunta');
        }
        i++;
      }
      if (!obj.fullname) obj.fullname = (obj.name + ' ' + obj.surname).trim();
      if (obj.phones.length > 0 || obj.birthday) {
        contacts.push(obj);
      }
    }
    return contacts;
  },

  decodeQP(value, params) {
    const isQP = params.some(p => p.toUpperCase() === 'ENCODING=QUOTED-PRINTABLE' || p.toUpperCase() === 'QUOTED-PRINTABLE');
    if (!isQP) return value;
    // simple QP decode
    return value.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  },

  parseDate(str) {
    if (!str) return null;
    const clean = str.replace(/-/g, '');
    if (clean.length === 8) {
      const y = parseInt(clean.slice(0, 4), 10);
      const m = parseInt(clean.slice(4, 6), 10);
      const d = parseInt(clean.slice(6, 8), 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return { year: y, month: m, day: d };
    }
    if (clean.length === 4) {
      const m = parseInt(clean.slice(0, 2), 10);
      const d = parseInt(clean.slice(2, 4), 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return { year: null, month: m, day: d };
    }
    // try ISO
    const iso = new Date(str);
    if (!isNaN(iso.getTime())) {
      return { year: iso.getFullYear(), month: iso.getMonth() + 1, day: iso.getDate() };
    }
    return null;
  },

  // --- CSV Onomastici ---
  async parseCSV(file, encoding = 'iso-8859-1') {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder(encoding);
    const text = decoder.decode(buffer);
    const entries = [];
    const lines = text.replace(/\r\n|\r/g, '\n').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      // Supporta virgola o punto-e-virgola
      const sep = trimmed.includes(';') ? ';' : ',';
      const parts = trimmed.split(sep).map(s => s.trim());
      if (parts.length >= 3) {
        const name = parts[0];
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10);
        if (name && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          entries.push({ name: this.normalizeName(name), day, month });
        }
      }
    }
    return entries;
  },

  normalizeName(name) {
    return name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
};
