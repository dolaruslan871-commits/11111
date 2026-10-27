import { mountPet3D } from './pet-3d.js';
const texts = {
 ru: {title:'Paw Guide',step:'Шаг',of:'из',skip:'Пропустить',back:'Назад',next:'Дальше',finish:'Забрать звёздочку',done:'Мы подружились! Звёздочка уже в гардеробе.',steps:[['Привет! Я твой новый друг 💜','Теперь я буду жить на твоём рабочем столе. Давай познакомимся!'],['Попробуй меня погладить','Нажми на голову. На рабочем столе удерживай левую кнопку, чтобы перенести меня, а правой открой быстрое меню.'],['Заглянем в гардероб','Нажми на подсвеченный аксессуар — я сразу его примерю. В конце знакомства подарю тебе звёздочку.'],['Настроим Paw под тебя','Здесь темы, размер, погода, звук и Bluetooth. Настоящие кнопки работают прямо во время обучения.'],['Я готов поселиться рядом!','Покажи меня на рабочем столе. Обучение можно повторить в настройках → «Обучение Paw».']]},
 uk: {title:'Paw Guide',step:'Крок',of:'із',skip:'Пропустити',back:'Назад',next:'Далі',finish:'Забрати зірочку',done:'Ми подружилися! Зірочка вже в гардеробі.',steps:[['Привіт! Я твій новий друг 💜','Тепер я житиму на твоєму робочому столі. Познайоммося!'],['Спробуй мене погладити','Натисни на голову. На робочому столі утримуй ліву кнопку, щоб перенести мене, а правою відкрий швидке меню.'],['Зазирнімо до гардероба','Натисни на підсвічений аксесуар — я одразу його приміряю. Наприкінці знайомства подарую тобі зірочку.'],['Налаштуй Paw для себе','Тут теми, розмір, погода, звук і Bluetooth. Справжні кнопки працюють під час навчання.'],['Я готовий оселитися поруч!','Покажи мене на робочому столі. Навчання можна повторити в налаштуваннях → «Навчання Paw».']]},
 en: {title:'Paw Guide',step:'Step',of:'of',skip:'Skip',back:'Back',next:'Next',finish:'Claim my star',done:'We’re friends! Your star is in the wardrobe.',steps:[['Hi! I’m your new friend 💜','I’ll be living on your desktop. Let’s get to know each other!'],['Try petting me','Click my head. On the desktop, hold the left button to move me; right-click for quick actions.'],['Let’s visit the wardrobe','Click the highlighted accessory to try it on. I’ll give you a little star when we finish.'],['Make Paw your own','Find themes, size, weather, audio and Bluetooth here. The real controls work during this tour.'],['Ready to live by your side!','Show me on your desktop. Replay this guide anytime in Settings → Paw Guide.']]}
};
export function createPawGuide({api,getState,navigate,notify}) {
 let scene=null,active=false,lastStep=-1,lastLanguage='',host=null;
 function cleanup(){scene?.dispose();scene=null;host?.remove();host=null;document.querySelectorAll('.guide-target').forEach(e=>e.classList.remove('guide-target'));}
 async function go(step){await api.update({guideStep:step});navigate(step===2?'wardrobe':step===3?'settings':'home');sync();}
 async function end(skipped){await api.guide(skipped?'skip':'complete');active=false;cleanup();if(!skipped)notify((texts[getState().language]||texts.en).done);}
 function sync(){
  const s=getState(); if(s.guideStatus){active=false;cleanup();return;}
  if(!s.languageConfirmed)return;
  const step=s.guideStep||0,c=texts[s.language]||texts.en;
  if(!active){active=true;navigate(step===2?'wardrobe':step===3?'settings':'home');}
  if(!host||lastStep!==step||lastLanguage!==s.language){
   cleanup();lastStep=step;lastLanguage=s.language;host=document.createElement('aside');host.className='paw-guide';host.setAttribute('aria-label',c.title);
   host.innerHTML=`<header><strong>${c.title}</strong><button data-guide-skip>${c.skip}</button></header><div class="guide-mascot"></div><div class="guide-copy" aria-live="polite"><small>${c.step} ${step+1} ${c.of} 5</small><h2>${c.steps[step][0]}</h2><p>${c.steps[step][1]}</p></div><progress max="5" value="${step+1}"></progress><nav><button data-guide-back ${step===0?'disabled':''}>${c.back}</button><button class="primary-button" data-guide-next>${step===4?c.finish:c.next}</button></nav>`;
   document.body.append(host);scene=mountPet3D(host.querySelector('.guide-mascot'),{...s,skin:'rabbit',companion:null,desktopPet:false,outfit:{},activity:step===0?'wave':'idle',motion:null});
   host.querySelector('[data-guide-skip]').onclick=()=>end(true);host.querySelector('[data-guide-back]').onclick=()=>go(Math.max(0,step-1));host.querySelector('[data-guide-next]').onclick=()=>step===4?end(false):go(step+1);
  }
  document.querySelectorAll('.guide-target').forEach(e=>e.classList.remove('guide-target'));
  const selectors=['#show-pet','#pat-pet','[data-outfit="bow"]','.appearance-v5','#show-pet'];
  document.querySelector(selectors[step])?.classList.add('guide-target');
 }
 return {sync,replay:async()=>{cleanup();active=false;await api.guide('replay');navigate('home');sync();},dispose:cleanup};
}
