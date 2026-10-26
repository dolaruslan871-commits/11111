/** Original, self-contained vector characters. No downloaded artwork or fonts. */
export const pets = [
  { id: 'dog', name: 'Собачка', description: 'Верный друг и охотник за курсором', color: '#eac499' },
  { id: 'cat', name: 'Котик', description: 'Немного нежности, немного озорства', color: '#efbb85' },
  { id: 'croc', name: 'Крокодильчик', description: 'Большая улыбка маленького друга', color: '#a5ccad' },
];

export const wardrobe = {
  hat: [
    { id: 'none', name: 'Без шапки' },
    { id: 'beanie', name: 'Вязаная шапочка' },
    { id: 'party', name: 'Праздничный колпачок' },
  ],
  glasses: [
    { id: 'none', name: 'Без очков' },
    { id: 'round', name: 'Круглые очки' },
    { id: 'sun', name: 'Солнечные очки' },
  ],
  scarf: [
    { id: 'none', name: 'Без шарфика' },
    { id: 'coral', name: 'Коралловый шарфик' },
    { id: 'sage', name: 'Шалфейный шарфик' },
  ],
  toy: [
    { id: 'none', name: 'Без игрушки' },
    { id: 'bone', name: 'Любимая косточка' },
    { id: 'ball', name: 'Теннисный мячик' },
  ],
};

let instance = 0;
const states = new Set(['idle', 'walk', 'sleep', 'eat', 'play', 'hunt', 'pet']);

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

function accessories(skin, outfit = {}) {
  const selection = Object.fromEntries(Object.entries(wardrobe).map(([key, values]) => [
    key, values.some((value) => value.id === outfit?.[key]) ? outfit[key] : 'none',
  ]));
  const y = skin === 'croc' ? 67 : skin === 'cat' ? 96 : 94;
  const hatY = skin === 'cat' ? -6 : skin === 'croc' ? -2 : 0;
  let content = '';
  if (selection.scarf !== 'none') {
    const color = selection.scarf === 'coral' ? '#d77e6b' : '#739d8b';
    const dark = selection.scarf === 'coral' ? '#b85e53' : '#537e6b';
    content += `<g class="pet-accessory pet-scarf"><path d="M91 138q39 21 77 0l-2 15q-34 21-72 0Z" fill="${color}" stroke="${dark}" stroke-width="1.5"/><path d="m141 153 19 4 6 30-21-2Z" fill="${color}" stroke="${dark}" stroke-width="1.5" stroke-linejoin="round"/><path d="m146 181 19 3m-18-10 16 2" fill="none" stroke="#fff5e4" stroke-width="3" opacity=".6"/><ellipse cx="145" cy="155" rx="10" ry="8" fill="${dark}"/></g>`;
  }
  if (selection.hat === 'beanie') {
    content += `<g class="pet-accessory pet-hat" transform="translate(0 ${hatY})"><path d="M89 40c0-26 16-38 41-38s41 12 41 38Z" fill="#8b9fc1" stroke="#647c9e" stroke-width="2"/><path d="M104 36c0-17 7-28 13-31m13-2v33m13-31c7 6 13 17 13 31" stroke="#bac8dd" stroke-width="2" fill="none" opacity=".7"/><rect x="84" y="31" width="91" height="18" rx="8" fill="#a7b8d3" stroke="#7087a7" stroke-width="2"/><path d="M97 35v10m10-10v10m10-10v10m10-10v10m10-10v10m10-10v10m10-10v10" stroke="#879cbc" stroke-width="2" stroke-linecap="round"/><circle cx="130" cy="4" r="10" fill="#b9c8df" stroke="#8198ba" stroke-width="1.5"/><rect x="137" y="35" width="17" height="10" rx="3" fill="#f7e6c6"/><path d="m143 40 2-2 3 3" fill="none" stroke="#bb9776" stroke-width="1.5" stroke-linecap="round"/></g>`;
  } else if (selection.hat === 'party') {
    content += `<g class="pet-accessory pet-hat" transform="translate(0 ${hatY})"><path d="m130 0-29 44q29 11 58 0Z" fill="#e3aa77" stroke="#c28e62" stroke-width="2" stroke-linejoin="round"/><path d="m112 28 30-9m-36 22 44-14" stroke="#f9e5c1" stroke-width="7"/><path d="m130 0-29 44q29 11 58 0Z" fill="none" stroke="#c28e62" stroke-width="2"/><circle cx="130" cy="3" r="9" fill="#e9a29b"/><path d="M101 44q28 11 58 0" stroke="#a1799f" stroke-width="7" fill="none" stroke-linecap="round"/></g>`;
  }
  if (selection.glasses === 'round') {
    content += `<g class="pet-accessory pet-glasses" fill="none" stroke="#746251" stroke-width="3"><circle cx="100" cy="${y}" r="17"/><circle cx="159" cy="${y}" r="17"/><path d="M117 ${y - 1}q12-8 25 0m-59 0-9-3m102 3 9-3" stroke-linecap="round"/><path d="m89 ${y - 8} 3-3m56 3 3-3" stroke="#fff" opacity=".7" stroke-linecap="round"/></g>`;
  } else if (selection.glasses === 'sun') {
    content += `<g class="pet-accessory pet-glasses"><path d="M79 ${y - 12}h42l-4 22q-18 14-34-2Zm59 0h42l-4 20q-16 16-34 2Z" fill="#434b48" stroke="#283c34" stroke-width="3" stroke-linejoin="round"/><path d="M122 ${y - 6}q7-4 15 0m-59-1-8-3m110 3 8-3" stroke="#283c34" stroke-width="3" fill="none" stroke-linecap="round"/><path d="m89 ${y + 3} 13-13m44 13 13-13" stroke="#a4c1b4" stroke-width="4" opacity=".4" stroke-linecap="round"/></g>`;
  }
  if (selection.toy === 'bone') {
    const mouthY = skin === 'croc' ? 128 : 133;
    content += `<g class="pet-accessory pet-toy pet-toy-bone" transform="translate(130 ${mouthY}) rotate(-9)"><path d="M-20-5c-4-9-15-9-16-1-8 1-8 12 1 13 4 8 15 5 16-3h38c1 8 12 11 16 3 9-1 9-12 1-13-1-8-12-8-16 1Z" fill="#fff5dd" stroke="#cfba91" stroke-width="2"/><path d="M-14-1h28" stroke="#ead9b6" stroke-width="2" stroke-linecap="round"/></g>`;
  } else if (selection.toy === 'ball') {
    content += `<g class="pet-accessory pet-toy pet-toy-ball"><circle cx="130" cy="190" r="18" fill="#dbce73" stroke="#afa652" stroke-width="2"/><path d="M116 179c12 0 20 10 20 28m9-28c-12 2-19 13-18 29" stroke="#fff8d9" stroke-width="2.8" fill="none"/><circle cx="123" cy="182" r="4" fill="#fff" opacity=".2"/></g>`;
  }
  return content;
}

/** Safe to insert in innerHTML: all inputs are restricted to known values. */
export function renderPet(skin = 'dog', state = 'idle', outfit = {}) {
  const pet = pets.find((item) => item.id === skin) ?? pets[0];
  const mode = states.has(state) ? state : 'idle';
  const id = `paw-${pet.id}-${++instance}`;
  const content = pet.id === 'cat' ? cat(id, mode === 'sleep')
    : pet.id === 'croc' ? croc(id, mode === 'sleep')
      : dog(id, mode === 'sleep', mode === 'pet' || mode === 'play');
  return `<svg id="${id}" class="pet-art pet-${pet.id} state-${mode}" viewBox="0 0 260 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${pet.name}${mode === 'sleep' ? ' спит' : ''}">${content}${accessories(pet.id, outfit)}</svg>`;
}
