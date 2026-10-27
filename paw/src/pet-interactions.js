export function createPetInteractions(action, now = () => performance.now()) {
 let bellyTaps=[],pawTaps=[],spins=[];
 function tap(part){
  const time=now();
  if(part==='body'||part==='belly'){
   bellyTaps=bellyTaps.filter(t=>time-t<1600);bellyTaps.push(time);
   if(bellyTaps.length===3){bellyTaps=[];action('roll');return 'roll';}
   return null;
  }
  bellyTaps=[];
  const direct={ear:'ear-scratch',nose:'nose-boop',head:'pet',tail:'chase-tail'}[part];
  if(direct){pawTaps=[];action(direct);return direct;}
  if(part!=='paw'){pawTaps=[];return null;}
  pawTaps=pawTaps.filter(t=>time-t<1400);pawTaps.push(time);
  if(pawTaps.length===3){pawTaps=[];action('angry');return 'angry';}
  return null;
 }
 function doubleTap(part){if(['ear','nose','head','tail','body','belly'].includes(part))return null;action('pet');return 'pet';}
 function spin(delta){const t=now();spins=spins.filter(x=>t-x.t<1800);spins.push({t,d:Math.abs(delta)});if(spins.reduce((n,x)=>n+x.d,0)>500){spins=[];action('dance');return 'dance';}return null;}
 return {tap,doubleTap,spin};
}
