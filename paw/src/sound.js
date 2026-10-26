// Original procedural cartoon voices; no recordings or network requests.
let audio;
export function petSound(skin,muted,emotion='happy'){
  if(muted||emotion==='sleep')return;
  try{audio ||= new AudioContext();const resume=audio.resume();resume?.catch(()=>{});const now=audio.currentTime+.015;
    const soft=emotion==='sad'?.55:emotion==='excited'?1.1:.8;
    function voice(freq,points,start,length,type='triangle',level=.06,formants=[700,1400]){
      const source=audio.createOscillator(),envelope=audio.createGain();source.type=type;source.frequency.setValueAtTime(freq,start);
      for(const [ratio,value]of points)source.frequency.exponentialRampToValueAtTime(value,start+length*ratio);
      const mix=audio.createGain();mix.gain.value=.5;
      for(const frequency of formants){const f=audio.createBiquadFilter();f.type='bandpass';f.frequency.value=frequency;f.Q.value=2.3;source.connect(f);f.connect(mix);}
      mix.connect(envelope);envelope.connect(audio.destination);envelope.gain.setValueAtTime(.001,start);envelope.gain.exponentialRampToValueAtTime(level*soft,start+.018);envelope.gain.exponentialRampToValueAtTime(.001,start+length);source.start(start);source.stop(start+length+.03);
    }
    function breath(start,length,level,frequency){const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*length),audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const noise=audio.createBufferSource();noise.buffer=buffer;const f=audio.createBiquadFilter();f.type='bandpass';f.frequency.value=frequency;f.Q.value=1;const gain=audio.createGain();gain.gain.setValueAtTime(.001,start);gain.gain.linearRampToValueAtTime(level*soft,start+.014);gain.gain.exponentialRampToValueAtTime(.001,start+length);noise.connect(f);f.connect(gain);gain.connect(audio.destination);noise.start(start);noise.stop(start+length);}
    if(skin==='dog'){const repeats=emotion==='sad'?1:2;for(let i=0;i<repeats;i++){const start=now+i*.23;voice(230,[[.2,170],[.6,130],[1,105]],start,.17,'sawtooth',.12,[480,1050]);breath(start,.14,.045,750);}}
    else if(skin==='cat'){voice(520,[[.18,790],[.5,670],[.8,420],[1,300]],now,emotion==='sad'?.65:.48,'sawtooth',.09,[820,1500]);voice(1040,[[.18,1580],[.5,1340],[1,600]],now,.48,'sine',.012,[1200,2400]);}
    else{voice(330,[[.12,590],[.4,300],[1,100]],now,.22,'triangle',.085,[1100,1800]);voice(115,[[.4,80],[1,62]],now+.23,.24,'sawtooth',.07,[220,570]);breath(now+.23,.22,.02,360);}
  }catch{}
}
