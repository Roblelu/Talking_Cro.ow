/** Deterministic baseline: runs before billing and after optional remote moderation. */
const CENSORED_MESSAGE = 'Este mensaje fue censurado.';
const WORDS = [
  'puta', 'puto', 'putas', 'putos', 'putazo', 'putazos', 'putita', 'putito',
  'mierda', 'mierdas', 'verga', 'vergas', 'pendejo', 'pendeja', 'pendejos', 'pendejas', 'pendejada', 'pendejadas',
  'chingar', 'chinga', 'chingada', 'chingado', 'chingados', 'chingadas', 'chingate', 'chingas', 'chinguen', 'chingues',
  'cabron', 'cabrona', 'cabrones', 'cabronas', 'cojones', 'cojon', 'coño', 'joder', 'jodete', 'jodido', 'jodida',
  'gilipollas', 'capullo', 'capulla', 'hostia', 'hostias', 'carajo', 'pinche', 'pinches',
  'perra', 'perras', 'zorra', 'zorras', 'vrga', 'mrd', 'gaver',
  'polla', 'pollas', 'follar', 'follando', 'cagar', 'cagada', 'cagadas', 'cagas',
  'culero', 'culera', 'culeros', 'culeras', 'culo', 'culos', 'maricon', 'maricones', 'marica',
  'mamon', 'mamona', 'mamones', 'mamada', 'mamadas', 'hijueputa', 'hdp', 'ctm', 'chinga tu madre',
  'fuck', 'fucking', 'motherfucker', 'shit', 'bitch', 'asshole', 'nigger', 'nigga', 'faggot',
];
const separator = '[\\s\\p{P}\\p{S}_]*';
const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${WORDS.map(word => [...word.replaceAll(' ', '')].map(char => `${char}+`).join(separator)).join('|')})(?![\\p{L}\\p{N}])`, 'iu');
function filterProfanity(text) {
  if (typeof text !== 'string' || !text.trim()) return CENSORED_MESSAGE;
  const clean = text.normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '').trim();
  const comparable = clean.toLowerCase().replaceAll('ñ', '\uE000').normalize('NFD').replace(/\p{M}/gu, '').replaceAll('\uE000', 'ñ')
    .replace(/[013457@$]/g, char => ({0:'o',1:'i',3:'e',4:'a',5:'s',7:'t','@':'a','$':'s'}[char]));
  return pattern.test(comparable) ? CENSORED_MESSAGE : clean;
}
module.exports = { filterProfanity, CENSORED_MESSAGE };
