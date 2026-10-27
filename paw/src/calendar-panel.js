import {petAge,milestoneDate} from './pet-calendar.js';
import {escapeHTML as esc} from './v5-ui.js';
const calendarUpdates=new WeakMap();
export function refreshCalendar(root){const host=root.querySelector(".pet-calendar");if(host&&host.dataset.day!==key(new Date()))calendarUpdates.get(host)?.();}
const locale=lang=>lang==='en'?'en-GB':lang==='uk'?'uk-UA':'ru-RU';
const key=date=>`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
export function calendarPanel(state){
 const c=(ru,uk,en)=>state.language==='en'?en:state.language==='uk'?uk:ru;
 return `<section class="life-card pet-calendar"><header><div><h2>${c('Календарь взросления','Календар дорослішання','Growing-up calendar')}</h2><p class="feature-hint">${c('Первый запуск — первый день жизни. Возраст и рост сохраняются между запусками.','Перший запуск — перший день життя. Вік і ріст зберігаються між запусками.','First launch is day one. Age and growth continue between visits.')}</p></div></header><div class="calendar-navigation"><button id="calendar-prev" aria-label="${c('Предыдущий месяц','Попередній місяць','Previous month')}">‹</button><strong id="calendar-month"></strong><button id="calendar-next" aria-label="${c('Следующий месяц','Наступний місяць','Next month')}">›</button><button id="calendar-today">${c('Сегодня','Сьогодні','Today')}</button></div><div id="calendar-grid" class="calendar-grid"></div><p id="calendar-day-detail" class="calendar-detail" role="status" aria-live="polite"></p><div id="calendar-milestones" class="calendar-milestones"></div></section>`;
}
export function bindCalendar(root,getState){
 const host=root.querySelector('.pet-calendar');if(!host)return;
 let month=new Date();month.setDate(1);let selected=new Date();
 function draw(){
  host.dataset.day=key(new Date());
  const s=getState(),lang=locale(s.language),now=new Date(),birth=s.life?.bornAt||Date.now();
  const c=(ru,uk,en)=>s.language==='en'?en:s.language==='uk'?uk:ru;
  const marks=[{date:milestoneDate(birth,0),label:c('День появления','День появи','First day'),icon:'♡'},
   {date:milestoneDate(birth,14),label:c('Юный питомец','Юний улюбленець','Young pet'),icon:'❋'},
   {date:milestoneDate(birth,56),label:c('Взрослый питомец','Дорослий улюбленець','Adult pet'),icon:'✦'}];
  host.querySelector('#calendar-month').textContent=month.toLocaleDateString(lang,{month:'long',year:'numeric'});
  const first=new Date(month.getFullYear(),month.getMonth(),1,12),offset=(first.getDay()+6)%7;
  const start=new Date(first);start.setDate(1-offset);
  const week=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  let html=week.map((_,i)=>`<span class="calendar-weekday">${new Date(2026,0,5+i).toLocaleDateString(lang,{weekday:'short'})}</span>`).join('');
  for(let i=0;i<42;i++){
   const date=new Date(start);date.setDate(start.getDate()+i);
   const mark=marks.find(m=>key(m.date)===key(date)),today=key(date)===key(now);
   const days=petAge(birth,date.getTime()).age,afterBirth=date>=milestoneDate(birth,0);
   const lived=afterBirth&&date<=now;
   html+=`<button data-calendar-date="${date.getTime()}" class="${date.getMonth()!==month.getMonth()?'outside ':''}${today?'today ':''}${lived?'lived ':''}${key(selected)===key(date)?'selected':''}" aria-pressed="${key(selected)===key(date)}" ${today?'aria-current="date"':''} title="${esc(date.toLocaleDateString(lang)+(mark?' · '+mark.label:''))}"><span>${date.getDate()}</span><small>${mark?mark.icon:lived?c('д. ','д. ','d. ')+days:''}</small></button>`;
  }
  host.querySelector('#calendar-grid').innerHTML=html;
  const age=petAge(birth,selected.getTime()).age;
  const before=selected<new Date(new Date(birth).setHours(0,0,0,0));
  const tasks=(s.life?.tasks||[]).filter(t=>t.due&&key(new Date(t.due))===key(selected));
  host.querySelector('#calendar-day-detail').textContent=selected.toLocaleDateString(lang,{day:'numeric',month:'long',year:'numeric'})+' · '+(before?c('До появления питомца','До появи улюбленця','Before your pet arrived'):c('День жизни: ','День життя: ','Day of life: ')+age)+(tasks.length?' · '+tasks.map(t=>t.text).join(' · '):'');
  host.querySelector('#calendar-milestones').innerHTML=marks.map(m=>`<div><span>${m.icon}</span><strong>${esc(m.label)}</strong><small>${esc(m.date.toLocaleDateString(lang,{day:'numeric',month:'short',year:'numeric'}))}</small></div>`).join('');
  host.querySelectorAll('[data-calendar-date]').forEach(e=>e.onclick=()=>{selected=new Date(Number(e.dataset.calendarDate));draw();});
 }
 host.querySelector('#calendar-prev').onclick=()=>{month.setMonth(month.getMonth()-1);draw();};
 host.querySelector('#calendar-next').onclick=()=>{month.setMonth(month.getMonth()+1);draw();};
 host.querySelector('#calendar-today').onclick=()=>{month=new Date();month.setDate(1);selected=new Date();draw();};
 calendarUpdates.set(host,draw);draw();
}
