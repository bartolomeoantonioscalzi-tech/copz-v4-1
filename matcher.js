/* === C&OPZ v4.1 — Matcher === */

const Matcher = {
  TITLES: ['sig','sigra','sig\.','sigra\.','dott','dott\.','dottssa','dottssa\.','dr','dr\.','ing','ing\.','prof','prof\.','arch','arch\.','avv','avv\.','on','on\.','cav','cav\.','gen','gen\.','col','col\.','mag','mag\.','cap','cap\.','ten','ten\.','mar','mar\.','sua','sua\.','eccellenza','eminenza','altezza','maesta','principe','principessa','duca','duchessa','conte','contessa','barone','baronessa','don','donna','signor','signora','signorina','miss','mrs','mr','ms','mx'],

  primoNome(fullname) {
    if (!fullname) return '';
    // Rimuovi titoli
    let clean = fullname.toLowerCase();
    for (const t of this.TITLES) {
      const re = new RegExp('\\b' + t.replace(/\\./g, '\\\\.') + '\\b\\.?\\s*', 'gi');
      clean = clean.replace(re, '');
    }
    clean = clean.replace(/[^a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\s]/gi, ' ').trim();
    const parts = clean.split(/\s+/).filter(s => s.length > 0);
    return parts[0] || '';
  },

  normalizza(str) {
    return str
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  },

  matchOnomastico(contact, onomastici) {
    const nome = this.normalizza(this.primoNome(contact.fullname || contact.name));
    if (!nome) return null;
    return onomastici.find(o => this.normalizza(o.name) === nome) || null;
  },

  matchCompleanno(contact, month, day) {
    if (!contact.birthday) return false;
    return contact.birthday.month === month && contact.birthday.day === day;
  }
};
