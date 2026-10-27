/** Original, self-contained vector characters. No downloaded artwork or fonts. */
import catalog from './catalog.json' with { type: 'json' };
export const pets = [
  {id:'fox',name:'Лисёнок',names:{ru:'Лисёнок',uk:'Лисеня',en:'Fox'},description:'Озорной лесной друг',color:'#dca174'},
  {id:'husky',name:'Хася',names:{ru:'Хася',uk:'Хася',en:'Hasya'},description:'Хаски с голубыми глазами',color:'#9ba7b8'},
  { id: 'dog', name: 'Собачка', description: 'Верный друг и охотник за курсором', color: '#eac499' },
  { id: 'cat', name: 'Котик', description: 'Немного нежности, немного озорства', color: '#efbb85' },
  { id: 'croc', name: 'Крокодильчик', description: 'Большая улыбка маленького друга', color: '#a5ccad' },
  { id: 'kangaroo', name: 'Кенгуру', description: 'Любопытный прыгун с кармашком', color: '#cfa57e' },
  { id: 'dinosaur', name: 'Динозаврик', description: 'Доисторический друг с добрым сердцем', color: '#83b4ab' },
  { id: 'owl', name: 'Сова', description: 'Мягкие перья и внимательные глаза', color: '#a596bd' },
  { id: 'rabbit', name: 'Зайчик', description: 'Длинные ушки и быстрые лапки', color: '#d3c7bd' },
];

export const wardrobe = catalog.wardrobe;

let instance = 0;
const states = new Set(['idle','walk','sleep','eat','play','hunt','pet','stand','wave','stretch','sad','excited','carry','angry','chase-tail']);

function eyes(sleeping, left, right, y, color = '#45362f') {
  if (sleeping) {
    return `<g class="pet-eyes" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round"><path d="M${left - 7} ${y - 1}q7 8 14 0"/><path d="M${right - 7} ${y - 1}q7 8 14 0"/></g>`;
  }
  return `<g class="pet-eyes"><ellipse cx="${left}" cy="${y}" rx="5.7" ry="7.5" fill="${color}"/><ellipse cx="${right}" cy="${y}" rx="5.7" ry="7.5" fill="${color}"/><circle cx="${left - 1.6}" cy="${y - 2.7}" r="2" fill="#fffdf5"/><circle cx="${right - 1.6}" cy="${y - 2.7}" r="2" fill="#fffdf5"/></g>`;
}

function dog(id, sleeping, happy) {
  return `
    <defs>
      <linearGradient id="${id}-fur" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="#f6d6a7"/><stop offset="1" stop-color="#e7b574"/></linearGradient>
      <linearGradient id="${id}-ear" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c38751"/><stop offset="1" stop-color="#a96f41"/></linearGradient>
      <linearGradient id="${id}-cream" x1="0" y1="0" x2="0.5" y2="1"><stop stop-color="#fff9e9"/><stop offset="1" stop-color="#f9e5c2"/></linearGradient>
    </defs>
    <ellipse class="pet-shadow" cx="133" cy="218" rx="70" ry="9" fill="#302f25" opacity=".09"/>
    <g class="pet-tail"><path d="M175 170c26-4 40-26 31-39-5-8-15-6-17 1 9 11-4 21-20 21" fill="url(#${id}-fur)" stroke="#cd995f" stroke-width="2.5" stroke-linejoin="round"/><path d="M205 130c-5-6-13-3-14 3 3 4 3 8 1 12 10-2 17-8 13-15" fill="#fff3d9"/></g>
    <g class="pet-body">
      <path d="M95 128c-20 15-28 43-25 64 3 18 23 25 61 25 39 0 58-7 59-25 2-26-9-54-28-66Z" fill="url(#${id}-fur)" stroke="#d5a367" stroke-width="2.2"/>
      <path d="M109 138c-12 14-17 31-15 49 1 17 15 22 37 22s37-6 37-23c1-18-8-37-19-49Z" fill="url(#${id}-cream)"/>
      <g class="pet-leg pet-leg-back"><ellipse cx="81" cy="204" rx="24" ry="13" fill="#e6b273" stroke="#d2a16a" stroke-width="2"/><path d="M70 204v5m9-5v7" fill="none" stroke="#c5915c" stroke-width="2" stroke-linecap="round"/></g>
      <g class="pet-leg pet-leg-front"><ellipse cx="179" cy="204" rx="24" ry="13" fill="#e6b273" stroke="#d2a16a" stroke-width="2"/><path d="M184 204v7m9-7v5" fill="none" stroke="#c5915c" stroke-width="2" stroke-linecap="round"/></g>
      <g class="pet-paw pet-paw-left"><path d="M106 170l-5 34c-2 9 3 14 14 14 10 0 16-4 15-12l-1-35" fill="url(#${id}-cream)" stroke="#d9b989" stroke-width="2"/><path d="M111 209v7m9-7v7" stroke="#d6b58a" stroke-width="2" stroke-linecap="round"/></g>
      <g class="pet-paw pet-paw-right"><path d="M141 171l-1 35c0 8 6 12 16 12 11 0 16-5 14-14l-5-34" fill="url(#${id}-cream)" stroke="#d9b989" stroke-width="2"/><path d="M151 209v7m9-7v7" stroke="#d6b58a" stroke-width="2" stroke-linecap="round"/></g>
      <path d="M91 135c18 13 57 18 80 0l-2 12c-20 15-55 12-76 0Z" fill="#6a9d86" stroke="#56846f" stroke-width="1.5"/><path d="M131 150l10 10-10 10-10-10Z" fill="#e7bc65" stroke="#c69c49" stroke-width="1.5"/><circle cx="131" cy="159" r="2.2" fill="#fff2ce"/>
    </g>
    <g class="pet-head">
      <path d="M88 48C67 42 52 57 48 80c-4 22 0 50 12 57 15 9 28-12 33-33l10-40Z" fill="url(#${id}-ear)" stroke="#9e6a43" stroke-width="2"/><path d="M68 64c-9 14-12 39-7 55" fill="none" stroke="#e0ac76" stroke-width="5" stroke-linecap="round" opacity=".45"/>
      <path d="M169 48c21-6 36 9 40 32 4 22 0 50-12 57-15 9-28-12-33-33l-10-40Z" fill="url(#${id}-ear)" stroke="#9e6a43" stroke-width="2"/><path d="M191 65c9 15 11 37 6 53" fill="none" stroke="#d6a06d" stroke-width="5" stroke-linecap="round" opacity=".4"/>
      <path d="M128 35c-34 0-59 24-59 59 0 35 17 57 60 58 43 0 61-23 61-57 0-35-25-60-62-60Z" fill="url(#${id}-fur)" stroke="#cc995e" stroke-width="2.3"/>
      <path d="M121 37c-9 13-13 30-10 46 3 14 12 25 19 25 9 0 17-11 20-25 3-17-2-33-11-46Z" fill="#fff1d5" opacity=".95"/>
      <path d="M112 35l12-12-2 12 15-13-3 14" fill="#f3ce98" stroke="#d1a16b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M88 79q8-5 15-1m51 0q8-4 15 1" stroke="#b9804c" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${eyes(sleeping, 99, 159, 94)}
      <ellipse cx="85" cy="113" rx="11" ry="6" fill="#df9c87" opacity=".46"/><ellipse cx="172" cy="113" rx="11" ry="6" fill="#df9c87" opacity=".46"/>
      <path d="M129 107c-7-8-26-7-30 6-5 15 13 25 30 25 18 0 35-10 30-25-4-13-23-14-30-6Z" fill="url(#${id}-cream)"/>
      <path d="M118 108c0-6 23-6 23 0 0 5-8 11-12 11s-11-6-11-11Z" fill="#49372d"/><ellipse cx="126" cy="106" rx="4" ry="1.7" fill="#fff" opacity=".25"/>
      <path d="M129 118v6m0 0q-7 7-14 1m14-1q7 7 14 1" fill="none" stroke="#76513b" stroke-width="2.5" stroke-linecap="round"/>
      ${!sleeping ? `<path d="M124 128h12v8c0 9-12 9-12 0Z" fill="#e78c8a"/><path d="M130 132v5" stroke="#c76e76" stroke-width="1.5" stroke-linecap="round"/>` : ''}
      ${happy ? '<path d="M84 55l-4-6m94 5 4-6" stroke="#d4a352" stroke-width="3" stroke-linecap="round"/>' : ''}
    </g>`;
}

function cat(id, sleeping) {
  return `
    <defs>
      <linearGradient id="${id}-fur" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#f8c895"/><stop offset="1" stop-color="#e5a36c"/></linearGradient>
      <linearGradient id="${id}-cream" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#f7e9d5"/></linearGradient>
    </defs>
    <ellipse class="pet-shadow" cx="132" cy="218" rx="70" ry="9" fill="#302f25" opacity=".09"/>
    <g class="pet-tail"><path d="M171 193c41 8 57-10 52-32-4-20-22-24-22-41 0-8 11-10 14-2" fill="none" stroke="#ce8a55" stroke-width="20" stroke-linecap="round"/><path d="M171 191c40 8 54-9 49-29-4-17-22-25-22-42 0-11 15-14 20-3" fill="none" stroke="#efb47d" stroke-width="14" stroke-linecap="round"/><path d="M215 117c-3-7-10-6-13-1" fill="none" stroke="#ffeed8" stroke-width="16" stroke-linecap="round"/><path d="M219 170l-12 1m6 18-10-5" stroke="#c98c58" stroke-width="6" stroke-linecap="round"/></g>
    <g class="pet-body">
      <path d="M99 125c-19 20-27 48-25 69 1 16 20 22 55 22s55-6 56-22c2-24-7-50-25-69Z" fill="url(#${id}-fur)" stroke="#cc945f" stroke-width="2.2"/>
      <path d="M114 139c-8 11-14 29-13 47 1 19 10 24 29 24 20 0 31-6 31-24 0-19-5-35-15-48Z" fill="url(#${id}-cream)"/>
      <path d="M82 159l15 6m-20 9 16 5m83-20-15 6m20 9-16 5" stroke="#cb8a54" stroke-width="5" stroke-linecap="round" opacity=".75"/>
      <g class="pet-leg pet-leg-back"><ellipse cx="82" cy="205" rx="23" ry="12" fill="#edb783" stroke="#cf9b6c" stroke-width="2"/><path d="M72 205v6m8-5v7" stroke="#d19b6d" stroke-width="2" stroke-linecap="round"/></g>
      <g class="pet-leg pet-leg-front"><ellipse cx="176" cy="205" rx="23" ry="12" fill="#edb783" stroke="#cf9b6c" stroke-width="2"/><path d="M178 206v7m8-8v6" stroke="#d19b6d" stroke-width="2" stroke-linecap="round"/></g>
      <g class="pet-paw pet-paw-left"><path d="M105 172l-4 34c-1 8 4 12 14 12 11 0 15-5 15-12l-1-33" fill="url(#${id}-cream)" stroke="#d5b28d" stroke-width="2"/><path d="M111 209v7m8-7v7" stroke="#d4b596" stroke-width="2" stroke-linecap="round"/></g>
      <g class="pet-paw pet-paw-right"><path d="M141 173l-1 33c0 7 5 12 15 12 11 0 16-4 15-12l-4-34" fill="url(#${id}-cream)" stroke="#d5b28d" stroke-width="2"/><path d="M151 209v7m8-7v7" stroke="#d4b596" stroke-width="2" stroke-linecap="round"/></g>
      <path d="M94 133q35 21 70 0l-1 10q-34 20-67 0Z" fill="#ab8cb5" stroke="#9575a0" stroke-width="1.5"/><circle cx="130" cy="151" r="7" fill="#e6bd72" stroke="#bf9650" stroke-width="1.5"/><path d="M127 154h6m-3-6v4" stroke="#a87b36" stroke-width="1.5" stroke-linecap="round"/>
    </g>
    <g class="pet-head">
      <path d="M77 77 70 27c0-7 6-9 11-5l36 27m65 28 7-50c0-7-6-9-11-5l-36 27" fill="url(#${id}-fur)" stroke="#c98c57" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="m80 40 4 32 23-15Zm99 0-4 32-23-15Z" fill="#e8a49a"/><path d="m84 50 2 16 12-8m77-8-2 16-12-8" fill="#f5bdb2"/>
      <path d="M129 41c-36 0-60 22-62 54-2 34 24 54 62 54 39 0 65-20 63-54-2-32-27-54-63-54Z" fill="url(#${id}-fur)" stroke="#ce945f" stroke-width="2.3"/>
      <path d="m113 45 4 18m12-20 1 21m15-18-3 18" fill="none" stroke="#ce8b54" stroke-width="6" stroke-linecap="round"/>
      <path d="M72 86l15 5m-17 9 15 3m101-17-15 5m17 9-15 3" stroke="#cb8b56" stroke-width="4" stroke-linecap="round"/>
      <path d="M110 106c7-6 11-14 19-16 9 2 13 10 20 16 8 6 13 11 12 22-8 13-54 15-64 0-2-10 6-17 13-22Z" fill="url(#${id}-cream)"/>
      ${eyes(sleeping, 100, 159, 96, '#4c4836')}
      <ellipse cx="85" cy="115" rx="10" ry="5" fill="#dc958a" opacity=".48"/><ellipse cx="174" cy="115" rx="10" ry="5" fill="#dc958a" opacity=".48"/>
      <path d="M123 111q7-4 14 0c2 3-4 9-7 9s-9-6-7-9Z" fill="#cf8d87"/>
      <path d="M130 120v5m0 0q-6 6-11 0m11 0q6 6 11 0" fill="none" stroke="#795847" stroke-width="2.3" stroke-linecap="round"/>
      <path d="m101 120-27-5m26 12-25 3m84-10 26-5m-26 12 25 3" fill="none" stroke="#9d7658" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>
    </g>`;
}

function croc(id, sleeping) {
  return `
    <defs>
      <linearGradient id="${id}-green" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#acd5a8"/><stop offset="1" stop-color="#79b88d"/></linearGradient>
      <linearGradient id="${id}-cream" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#eef0bd"/><stop offset="1" stop-color="#d7e3aa"/></linearGradient>
      <linearGradient id="${id}-snout" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b8dfaf"/><stop offset="1" stop-color="#97c997"/></linearGradient>
    </defs>
    <ellipse class="pet-shadow" cx="134" cy="218" rx="77" ry="9" fill="#302f25" opacity=".09"/>
    <g class="pet-tail"><path d="M171 174c26 14 47 10 65-8-3 29-23 46-58 42l-17-12Z" fill="url(#${id}-green)" stroke="#6d9d77" stroke-width="2.3" stroke-linejoin="round"/><path d="m188 183 4-12 9 13 8-13 6 11 10-11 3 7" fill="#629d74" stroke="#629d74" stroke-width="2" stroke-linejoin="round"/></g>
    <g class="pet-body">
      <path d="M95 126c-19 15-26 46-22 68 3 17 24 23 57 23 35 0 55-8 56-25 2-26-9-51-26-66Z" fill="url(#${id}-green)" stroke="#6f9f79" stroke-width="2.3"/>
      <path d="M115 140c-13 11-21 33-19 49 1 18 12 23 34 23 23 0 35-6 35-23 1-19-9-40-21-49Z" fill="url(#${id}-cream)"/>
      <path d="M107 159q24 7 47 0m-51 16q27 8 55 0m-55 16q27 8 54 0" stroke="#afc58e" stroke-width="2" fill="none" opacity=".7"/>
      <g class="pet-paw pet-paw-left"><path d="M85 152c-17 2-25 18-21 29 2 6 12 5 16 0l18-14" fill="url(#${id}-green)" stroke="#719f78" stroke-width="2"/><path d="m65 179 4 4m1-9 4 5" stroke="#dce5bd" stroke-width="3" stroke-linecap="round"/></g>
      <g class="pet-paw pet-paw-right"><path d="M174 152c17 2 25 18 21 29-2 6-12 5-16 0l-18-14" fill="url(#${id}-green)" stroke="#719f78" stroke-width="2"/><path d="m194 179-4 4m-1-9-4 5" stroke="#dce5bd" stroke-width="3" stroke-linecap="round"/></g>
      <g class="pet-leg pet-leg-back"><path d="M91 191c-14 0-29 9-27 18 1 9 28 11 41 6 11-5 7-24-14-24Z" fill="#95c497" stroke="#709e78" stroke-width="2"/><path d="m72 207 2 6m8-8 1 9m9-8v8" stroke="#e5eacb" stroke-width="3" stroke-linecap="round"/></g>
      <g class="pet-leg pet-leg-front"><path d="M169 191c14 0 29 9 27 18-1 9-28 11-41 6-11-5-7-24 14-24Z" fill="#95c497" stroke="#709e78" stroke-width="2"/><path d="m188 207-2 6m-8-8-1 9m-9-8v8" stroke="#e5eacb" stroke-width="3" stroke-linecap="round"/></g>
      <path d="M85 147l-7 8m96-8 7 8m-97 28-7 3m100-3 7 3" stroke="#6eaa80" stroke-width="4" stroke-linecap="round"/>
      <path d="M91 131q39 24 77 0l-2 11q-36 21-73 0Z" fill="#e7b16c" stroke="#c19156" stroke-width="1.5"/><path d="m131 151 9 10-10 8-9-9Z" fill="#fff3cf" stroke="#caad70" stroke-width="1.5"/>
    </g>
    <g class="pet-head">
      <path d="m100 53 3-15 11 12 12-16 8 15 13-14 6 16" fill="#70a57b" stroke="#70a57b" stroke-width="2" stroke-linejoin="round"/>
      <path d="M129 48c-33 0-53 15-56 39-3 22 6 47 28 54 13 4 44 6 59-1 23-10 31-32 26-54-5-23-24-38-57-38Z" fill="url(#${id}-green)" stroke="#6f9f79" stroke-width="2.3"/>
      <path d="M81 85c-8-27 2-46 20-46 17 0 26 17 22 43m14 0c-4-26 5-43 22-43 18 0 28 19 20 46" fill="url(#${id}-green)" stroke="#6f9f79" stroke-width="2.3"/>
      ${eyes(sleeping, 101, 159, 67, '#374d3c')}
      <path d="M92 83c-15 0-32 5-34 21-2 19 20 36 71 36 52 0 74-17 72-36-2-16-20-21-35-21Z" fill="url(#${id}-snout)" stroke="#729f78" stroke-width="2.2"/>
      <path d="M63 112c12 15 44 21 66 21 25 0 55-6 67-21" fill="none" stroke="#588763" stroke-width="2.8" stroke-linecap="round"/>
      <path d="m83 123 5 9 6-5m70 0 6 5 5-9" fill="#fffbe9" stroke="#88ac84" stroke-width="1.2" stroke-linejoin="round"/>
      <ellipse cx="111" cy="96" rx="3" ry="2.3" fill="#699d73"/><ellipse cx="149" cy="96" rx="3" ry="2.3" fill="#699d73"/>
      <ellipse cx="77" cy="108" rx="10" ry="5" fill="#d1ae96" opacity=".4"/><ellipse cx="183" cy="108" rx="10" ry="5" fill="#d1ae96" opacity=".4"/>
      <path d="m82 83 5-2m86 2-5-2" stroke="#82b98a" stroke-width="3" stroke-linecap="round"/>
    </g>`;
}

function star(cx, cy, outer, inner = outer * .46) {
  return Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? inner : outer; return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`; }).join(' ');
}

/** The same catalog colors and silhouettes as the 3D wardrobe, drawn locally. */
function wardrobeDrawing(category, meta) {
  meta={...meta,id:meta.base||meta.id};
  const { id } = meta, c = meta.color, a = meta.accent;
  const circle = (x, y, r, fill = c, more = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${more}/>`;
  const rect = (x, y, w, h, fill = c, radius = 3) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`;
  const path = (d, fill = c, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const line = (d, stroke = a, width = 2) => path(d, 'none', `stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`);
  if (id === 'none') return circle(32, 32, 18, 'none', 'stroke="currentColor" stroke-width="2" opacity=".45"') + line('M20 44 44 20', 'currentColor', 2);
  if (category === 'hat') {
    if (['wizard', 'witch', 'party', 'santa'].includes(id)) {
      const cap = id === 'santa' ? 'M14 47Q12 19 36 12q17-1 17 17l-8 5-7-13-1 26Z' : 'M17 47 31 7 48 47Z';
      return path(cap) + (id === 'santa' ? rect(11, 43, 34, 9, a, 5) + circle(50, 31, 6, a) : path('M6 47q26-9 52 0l-4 7H10Z') + rect(22, 35, 20, 6, a, 0) + (id === 'party' ? circle(31, 8, 4, a) + circle(30, 25, 3, a) + circle(34, 39, 3, a) : `<polygon points="${star(32, 27, 6)}" fill="${a}"/>`));
    }
    if (id === 'crown') return path('M9 18 21 31 32 13 44 31 55 18 51 51H13Z') + rect(12, 44, 40, 8, a) + [11, 32, 53].map(x => circle(x, x === 32 ? 13 : 18, 3, a)).join('') + circle(32, 38, 4, a);
    if (id === 'headphones') return line('M12 40V30a20 20 0 0 1 40 0v10', c, 7) + rect(7, 31, 12, 21, a, 5) + rect(45, 31, 12, 21, a, 5);
    if (id === 'flower') return Array.from({length: 8}, (_, i) => {const ang=i*Math.PI/4;const x=32+Math.cos(ang)*20,y=32+Math.sin(ang)*15;return circle(x,y,7,c)+circle(x,y,3,a);}).join('');
    if (id === 'astronaut') return circle(32, 30, 24) + `<ellipse cx="32" cy="30" rx="19" ry="17" fill="${a}" opacity=".75"/>` + rect(13, 49, 38, 7, a) + line('M21 20q7-6 16-4', '#fff', 3);
    if (id === 'pumpkin') return `<ellipse cx="32" cy="34" rx="25" ry="19" fill="${c}"/>` + line('M22 17q-9 17 0 34m20-34q9 17 0 34M32 16v37', a, 2) + path('M29 17 31 8 38 9 35 18', a);
    if (id === 'beret') return `<ellipse cx="32" cy="32" rx="25" ry="14" fill="${c}" transform="rotate(-10 32 32)"/>` + rect(14, 41, 36, 7, a) + rect(31, 15, 4, 9, a);
    if (id === 'bucket') return path('M18 14h28l4 30H14Z') + path('M8 42q24-9 48 0l4 9H4Z', a);
    return path('M12 43V32a20 20 0 0 1 40 0v11Z') + rect(10, 39, 44, 11, a, 5) + (id === 'cap' ? path('M35 43q25-3 25 5-17 8-27 0Z') : circle(32, 10, 6, a)) + (id === 'winter' ? rect(9, 41, 9, 16, c, 4) + rect(46, 41, 9, 16, c, 4) : line('M20 24v12m8-16v16m8-16v16m8-12v12', a, 2));
  }
  if (category === 'glasses') {
    const lens = (x) => {
      if (id === 'heart') return path(`M${x} 23c-13-14-27 6 0 24 27-18 13-38 0-24Z`);
      if (id === 'star') return `<polygon points="${star(x, 33, 15, 7)}" fill="${c}"/>`;
      if (id === 'pixel') return rect(x - 12, 23, 24, 18, c, 0) + rect(x - 7, 27, 14, 9, a, 0);
      return circle(x, 33, 12, ['sun', 'aviator', 'ski'].includes(id) ? a : 'none', `stroke="${c}" stroke-width="3"`) + line(`M${x - 6} 29l5-3`, '#fff', 2);
    };
    return (id === 'monocle' ? lens(40) + line('M48 41q8 14-3 17', c, 2) : lens(17) + lens(47) + line('M29 31q3-4 6 0', c, 3)) + line(id === 'monocle' ? 'M51 31h8' : 'M5 30H1m58 0h4', c, 3);
  }
  if (category === 'scarf') {
    if (id === 'bowtie') return path('M7 17 29 27 29 38 7 48ZM57 17 35 27 35 38 57 48Z') + circle(32, 32, 7, a);
    if (id === 'bandana') return path('M8 17h48L32 54Z') + line('M16 22h32L32 43Z', a, 2);
    return rect(11, 11, 42, 13, c, 5) + path('M21 21h12l-5 34H16Zm16 0h12l3 29H39Z') + (id === 'polka' ? [22, 39, 48].map((x, i) => circle(x, 16 + i * 13, 2.5, a)).join('') : line('M14 17h36M20 31h10m-12 10h11m-12 9h10m13-20h9m-8 10h8', a, id === 'christmas' || id === 'halloween' ? 4 : 2)) + line('M17 54v5m5-5v5m5-5v5m13-9v5m5-5v5m5-5v5', a, 2);
  }
  if (category === 'toy') {
    if (id === 'bone') return path('M19 26c-8-12-18-3-11 5-7 9 4 17 11 7h26c7 10 18 2 11-7 7-8-3-17-11-5Z') + line('M22 31h20', a, 3);
    if (id === 'stick' || id === 'rope') return line('M8 38 55 26', c, id === 'rope' ? 9 : 7) + (id === 'stick' ? line('M39 30 42 19', c, 5) : line('M14 31l3 9m6-11 3 9m6-12 3 9m6-11 3 9m5-11 3 8', a, 2));
    if (id === 'ball') return circle(32, 32, 22) + line('M18 14q26 14 24 37M46 14Q20 28 22 51', a, 3);
    if (id === 'duck') return `<ellipse cx="30" cy="41" rx="23" ry="15" fill="${c}"/>` + circle(42, 24, 13) + path('M50 24h12l-3 8H49Z', a) + circle(44, 21, 2.5, '#302d2b');
    if (id === 'carrot') return path('M16 24 44 19 22 58Z') + line('M25 28 32 31m-9 7 5 2', a, 2) + path('M26 21Q9 10 20 4q7 3 12 15Q25 0 38 3l-2 16q9-20 15-9L40 22Z', a);
    if (id === 'fish') return `<ellipse cx="29" cy="33" rx="21" ry="14" fill="${c}"/>` + path('M47 33 60 18v29Z', a) + circle(18, 29, 3, '#302d2b') + line('M30 23q-5 10 0 20', a, 2);
    if (id === 'frisbee') return `<ellipse cx="32" cy="35" rx="27" ry="12" fill="${c}"/><ellipse cx="32" cy="32" rx="21" ry="7" fill="${a}"/>`;
    if (id === 'donut') return circle(32, 32, 24) + circle(32, 32, 10, a) + [0,1,2,3,4,5].map(i => {const an=i*Math.PI/3;return line(`M${32+Math.cos(an)*17} ${32+Math.sin(an)*17}l3-4`, a, 3);}).join('');
    if (id === 'christmas-tree') return rect(28, 45, 8, 15, '#8a664a') + path('M32 11 15 31h8L7 49h50L41 31h8Z') + `<polygon points="${star(32, 10, 8)}" fill="${a}"/>` + circle(24, 30, 3, '#df7071') + circle(39, 40, 3, a) + circle(21, 44, 3, '#eee8cf');
    if (id === 'pumpkin') return `<ellipse cx="32" cy="36" rx="25" ry="21" fill="${c}"/>` + line('M22 17q-8 20 0 37m20-37q8 20 0 37', a, 2) + path('M29 18 31 7 38 9 35 18', '#63814f') + path('M17 29 25 34H15Zm30 0-8 5h10ZM19 42l7 4 6-4 6 4 7-4-5 10H24Z', a);
    if (id === 'ghost') return path('M11 56V29a21 21 0 0 1 42 0v27l-9-7-12 8-11-8Z') + circle(25, 29, 3, a) + circle(40, 29, 3, a) + `<ellipse cx="32" cy="41" rx="4" ry="6" fill="${a}"/>`;
    return `<polygon points="${star(32, 32, 26)}" fill="${c}"/>` + circle(26, 30, 2, a) + circle(38, 30, 2, a);
  }
  if (category === 'clothing') {
    const base=path(id === 'dress' ? 'M22 10h20l4 17 14 30H4l14-30Z' : 'M21 10h22l17 12-8 13-8-7v29H20V28l-8 7-8-13Z');
    let detail = line('M25 12q7 11 14 0', a, 3);
    if (['bee','sailor','shirt','pajamas'].includes(id)) detail += line('M21 30h22M21 40h22M21 50h22', a, id === 'bee' ? 5 : 2);
    if (['vest','raincoat','shirt'].includes(id)) detail += line('M32 21v33', a, 2) + [27,36,45].map(y=>circle(35,y,1.5,a)).join('');
    if (id === 'hoodie') detail += path('M22 15Q16 0 32 2q17 0 10 13L32 19Z', a) + rect(25, 41, 15, 9, a);
    if (id === 'spacesuit') detail += rect(25, 28, 15, 13, a) + circle(29,32,2,'#df7771') + circle(36,36,2,'#8ca8b7');
    if (id === 'christmas') detail += `<polygon points="${star(32, 37, 9)}" fill="${a}"/>` + line('M21 22h22M21 51h22', a, 3);
    if (id === 'halloween') detail += path('M25 30 30 35h-7Zm14 0-5 5h7ZM24 40l6 3 4-3 6 3-3 5H27Z', a);
    if (id === 'dress') detail += line('M14 45h36', a, 4);
    return base+detail;
  }
  if (category === 'accessory') {
    if(id==='starter-star')return `<polygon points="${star(32,34,25)}" fill="${c}" stroke="${a}" stroke-width="2"/>`+circle(32,7,4,a);
    if (id === 'wings' || id === 'bat-wings') return path(id === 'bat-wings' ? 'M31 31 19 10 2 16 8 38l9-5 5 14 10-9 10 9 5-14 9 5 6-22-17-6-12 21Z' : 'M32 33Q17 2 5 14q-10 20 22 29Q6 38 13 52q14 8 19-15 5 23 19 15 7-14-14-9 32-9 22-29Q47 2 32 33Z') + line('M32 33 14 21m18 12 18-12', a, 2);
    if (id === 'cape') return path('M22 10h20l15 45q-25-10-50 0Z') + path('M23 10q9 12 18 0l-9 20Z', a);
    if (id === 'halo') return `<ellipse cx="32" cy="27" rx="25" ry="10" fill="none" stroke="${c}" stroke-width="6"/>` + line('M18 11v-5m28 5 3-5', a, 2);
    if (id === 'bell') return circle(32, 43, 7, a) + path('M13 45h38l-6-10V24a13 13 0 0 0-26 0v11Z') + line('M29 11V6h6v5', a, 3);
    if (id === 'bow') return path('M6 14 29 27 29 38 6 50ZM58 14 35 27 35 38 58 50Z') + circle(32, 32, 7, a);
    if (id === 'flower') return [0,1,2,3,4,5].map(i=>circle(32+Math.sin(i*Math.PI/3)*15,32+Math.cos(i*Math.PI/3)*15,12)).join('') + circle(32,32,10,a);
    if (id === 'badge') return path('M32 22C14 0-7 27 32 55 71 27 50 0 32 22Z') + line('M20 23q-5 2-4 8', a, 3);
    if (id === 'camera') return rect(5, 19, 54, 35, c, 5) + rect(15, 12, 15, 10, a) + circle(33, 36, 13, a) + circle(33, 36, 8, '#39404b') + circle(48, 26, 2, a);
    return line('M19 18v-5q13-14 26 0v5', c, 5) + rect(id === 'pouch' ? 13 : 10, 18, id === 'pouch' ? 38 : 44, 40, c, 7) + rect(17, 35, 30, 15, a, 4) + line('M15 28h34', a, 3);
  }
  return '';
}

export function renderWardrobeItem(category, id) {
  const meta = catalog.wardrobe[category]?.find(item => item.id === id);
  if (!meta) return '';
  return `<svg class="wardrobe-item-preview" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${wardrobeDrawing(category, meta)}</svg>`;
}

function extraPet(kind, id, sleeping) {
  const palettes = { kangaroo: ['#c79772','#f5dfbd','#966b51'], dinosaur: ['#83b4ab','#e3e7ba','#507e76'], owl: ['#a596bd','#f4e9df','#78678e'], rabbit: ['#d3c7bd','#fff5e9','#a99b93'] };
  const [fur,cream,dark]=palettes[kind];
  const ellipse=(x,y,rx,ry,fill,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
  const outline=`stroke="${dark}" stroke-width="2.2" stroke-linejoin="round"`;
  const path=(d,fill,extra=outline)=>`<path d="${d}" fill="${fill}" ${extra}/>`;
  let tail='',ears='',details='';
  if(kind==='kangaroo') {
    tail=path('M169 160q41 3 65 51-42-2-68-25Z',fur);
    ears=ellipse(98,45,14,40,fur,'transform="rotate(-18 98 45)" '+outline)+ellipse(159,45,14,40,fur,'transform="rotate(18 159 45)" '+outline)+ellipse(98,45,6,29,'#e4b1a1','transform="rotate(-18 98 45)"')+ellipse(159,45,6,29,'#e4b1a1','transform="rotate(18 159 45)"');
    details=path('M101 164q29 15 58 0v18q-28 35-58 0Z','#d5b38d')+path('M106 165q24 9 48 0','none',`stroke="${cream}" stroke-width="3"`);
  } else if(kind==='rabbit') {
    tail=ellipse(183,179,19,20,cream,outline);
    ears=ellipse(102,45,17,43,fur,'transform="rotate(-8 102 45)" '+outline)+ellipse(157,45,17,43,fur,'transform="rotate(8 157 45)" '+outline)+ellipse(102,44,8,32,'#e3b7b4','transform="rotate(-8 102 44)"')+ellipse(157,44,8,32,'#e3b7b4','transform="rotate(8 157 44)"');
  } else if(kind==='dinosaur') {
    tail=path('M168 158q34 27 69 6-4 40-63 40Z',fur)+path('M183 173 190 158 200 176 211 161 217 177 230 164',dark);
    ears=path('M93 63 102 39 116 58 132 35 146 57 162 39 171 66',dark);
    details=[0,1,2].map(i=>ellipse(86+i*4,153+i*13,5,4,dark)).join('');
  } else {
    ears=path('M74 93 66 46 107 69 153 69 195 46 187 98',fur);
    details=path('M83 140q-32 8-27 57 16 15 37-10ZM177 140q32 8 27 57-16 15-37-10Z',dark)+[0,1,2,3,4].map(i=>path(`M${106+i*11} ${166+(i%2)*12}q5 9 10 0`,'none',`stroke="${dark}" stroke-width="2"`)).join('');
  }
  const face = kind==='owl' ? ellipse(130,103,65,55,fur,outline)+ellipse(103,102,30,35,cream)+ellipse(157,102,30,35,cream)+(sleeping ? eyes(true,103,157,103,dark) : ellipse(103,102,16,20,'#fff9ed')+ellipse(157,102,16,20,'#fff9ed')+ellipse(106,104,10,13,'#40384b')+ellipse(154,104,10,13,'#40384b')+ellipse(101,98,4,5,'#fff')+ellipse(150,98,4,5,'#fff'))+path('M121 118 130 134 139 118Z','#d2a45d') : ellipse(130,99,58,53,fur,outline)+(kind==='dinosaur'?ellipse(130,121,54,24,cream,outline):ellipse(130,122,33,20,cream))+eyes(sleeping,103,157,99,dark)+path('M123 116q7-5 14 0-1 11-7 11-6 0-7-11Z',kind==='rabbit'?'#cb9296':dark)+path('M130 127v6m0 0q-8 6-14-1m14 1q8 6 14-1','none',`stroke="${dark}" stroke-width="2" stroke-linecap="round"`)+(kind==='rabbit'?path('M124 135v11h12v-11','#fff',`stroke="${dark}" stroke-width="1"`):'');
  return `<ellipse class="pet-shadow" cx="130" cy="219" rx="77" ry="9" fill="#302f25" opacity=".09"/>${tail}<g class="pet-body">${ellipse(130,169,57,47,fur,outline)}${ellipse(130,177,36,34,cream)}${ellipse(85,208,29,12,fur,outline)}${ellipse(175,208,29,12,fur,outline)}${details}${kind==='owl'?'':ellipse(102,177,11,27,fur,outline)+ellipse(158,177,11,27,fur,outline)}</g><g class="pet-head">${ears}${face}${ellipse(88,119,9,4,'#dea5a1','opacity=".55"')}${ellipse(172,119,9,4,'#dea5a1','opacity=".55"')}</g>`;
}

function accessories(skin, outfit = {}) {
  const positions={clothing:[70,133,121,86],scarf:[86,128,88,67],accessory:[104,132,53,54],hat:[85,0,90,63],glasses:[72,72,116,49],toy:[192,174,65,61]};
  return Object.entries(positions).map(([category, [x,y,width,height]])=>{
    const meta=catalog.wardrobe[category]?.find(item=>item.id===outfit[category]&&item.id!=='none');
    if(!meta)return '';
    return `<svg class="pet-accessory pet-${category}" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 64 64" aria-hidden="true">${wardrobeDrawing(category,meta)}</svg>`;
  }).join('');
}

/** Safe to insert in innerHTML: all inputs are restricted to known values. */
export function renderPet(skin = 'dog', state = 'idle', outfit = {}) {
  const pet = pets.find((item) => item.id === skin) ?? pets[0];
  const mode = states.has(state) ? state : 'idle';
  const id = `paw-${pet.id}-${++instance}`;
  const content = pet.id==='fox'?fox(mode==='sleep'):pet.id==='husky'?husky(mode==='sleep'):pet.id === 'cat' ? cat(id, mode === 'sleep')
    : pet.id === 'croc' ? croc(id, mode === 'sleep')
      : pet.id === 'dog' ? dog(id, mode === 'sleep', mode === 'pet' || mode === 'play')
        : extraPet(pet.id, id, mode === 'sleep');
  return `<svg id="${id}" class="pet-art pet-${pet.id} state-${mode}" viewBox="0 0 260 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${pet.name}${mode === 'sleep' ? ' спит' : ''}">${content}${accessories(pet.id, outfit)}</svg>`;
}

function husky(sleeping){return `<ellipse cx="130" cy="219" rx="70" ry="9" fill="#657083" opacity=".12"/><path d="M171 174c72 16 47-61 10-32 35-8 26 37-5 16" fill="#8f9cad" stroke="#657083" stroke-width="3"/><ellipse cx="130" cy="171" rx="48" ry="43" fill="#8f9cad"/><ellipse cx="130" cy="182" rx="32" ry="31" fill="#f8f7f1"/><path d="M77 91 78 25 112 67M148 67 181 25 183 91" fill="#8f9cad" stroke="#657083" stroke-width="4"/><path d="M85 69 85 39 103 69M157 69 175 39 175 69" fill="#d9b8ba"/><ellipse cx="130" cy="105" rx="60" ry="54" fill="#8f9cad"/><path d="M78 109q13-51 45-16l7-33 7 33q33-35 45 16l-11 33-41 18-41-18Z" fill="#faf9f2"/><ellipse cx="130" cy="130" rx="29" ry="18" fill="#fffdf7"/>${sleeping?eyes(true,105,155,106,'#435066'):'<g fill="#83c5e8" stroke="#516178" stroke-width="2"><ellipse cx="105" cy="106" rx="11" ry="13"/><ellipse cx="155" cy="106" rx="11" ry="13"/></g><g fill="#293849"><ellipse cx="105" cy="107" rx="5" ry="8"/><ellipse cx="155" cy="107" rx="5" ry="8"/></g><g fill="white"><circle cx="102" cy="102" r="3"/><circle cx="152" cy="102" r="3"/></g>'}<path d="M121 124q9-6 18 0-3 12-9 12t-9-12" fill="#354250"/><path d="M130 136v4m0 0q-8 8-15 0m15 0q8 8 15 0" fill="none" stroke="#657083" stroke-width="2"/><g fill="#faf9f2"><ellipse cx="101" cy="209" rx="19" ry="13"/><ellipse cx="159" cy="209" rx="19" ry="13"/></g>`;}

function fox(sleeping){return `<ellipse cx="130" cy="219" rx="70" ry="9" fill="#775641" opacity=".1"/><path d="M163 174Q232 103 238 194Q212 229 163 200Z" fill="#dc9868"/><path d="M226 157q22 27 12 37-15 22-36 14 23-19 24-51Z" fill="#fff0d8"/><ellipse cx="128" cy="173" rx="42" ry="40" fill="#dc9868"/><ellipse cx="128" cy="181" rx="24" ry="30" fill="#fff0d8"/><path d="M77 91 79 27 110 67M148 67 179 27 183 91" fill="#d28c60" stroke="#885d47" stroke-width="3"/><path d="M86 68 86 42 103 69M157 69 173 42 173 68" fill="#695348"/><path d="M71 99q6-44 59-44t59 44l-21 41-38 23-39-23Z" fill="#dc9868"/><path d="M75 109q24-13 55 20 31-33 55-20-12 44-55 48-43-4-55-48Z" fill="#fff0d8"/>${eyes(sleeping,105,155,105,'#634b3b')}<path d="M121 127q9-5 18 0-3 12-9 12t-9-12" fill="#513f36"/><path d="M130 139v5m0 0q-8 6-14-1m14 1q8 6 14-1" fill="none" stroke="#885d47" stroke-width="2"/><g fill="#5e4d44"><ellipse cx="102" cy="208" rx="16" ry="12"/><ellipse cx="154" cy="208" rx="16" ry="12"/></g>`;}
