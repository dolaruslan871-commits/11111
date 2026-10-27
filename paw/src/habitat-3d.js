import * as T from "./vendor/three.module.js";
import { makeHome, disposeHome } from "./home-art.js";
import { makeGroundToy } from "./pet-3d.js";
import { studioEnvironment } from "./pet-surfaces.js";

// Desktop housing and toys have their own transparent scene, with no duplicate
// pet hidden underneath. It renders only when appearance or window size changes.
export function mountHabitat3D(container,initial,kind) {
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,20);
  camera.position.set(2.3,1.9,3.8);camera.lookAt(0,.55,0);
  const hemi=new T.HemisphereLight("#e6eeff","#897262",1.5);scene.add(hemi);
  const key=new T.DirectionalLight("#fff2df",3.4);key.position.set(-3,5,4);scene.add(key);
  const rim=new T.DirectionalLight("#c7ddff",2);rim.position.set(3,3,-3);scene.add(rim);
  let renderer;
  try {renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});}
  catch {container.dataset.renderer="unavailable";return {update(){},dispose(){},inspect(){return {renderer:"unavailable"};}};}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
  const env=studioEnvironment(renderer);scene.environment=env.texture;scene.environmentIntensity=.45;
  renderer.setClearColor(0,0);container.replaceChildren(renderer.domElement);renderer.domElement.style.cssText="width:100%;height:100%;display:block";
  let state=initial,root=null,signature="",disposed=false;
  function draw(){if(!disposed)renderer.render(scene,camera);}
  function resize(){if(disposed)return;const w=container.clientWidth||280,h=container.clientHeight||240,zoom=kind==="toy"?.55:1.02;camera.left=-zoom*w/h;camera.right=zoom*w/h;camera.top=zoom;camera.bottom=-zoom;camera.updateProjectionMatrix();renderer.setSize(w,h,false);draw();}
  function update(next){
    state=next;
    const key=kind==="house"?`${state.skin}:${state.life?.house}:${state.life?.homeUpgrades}:${state.houseColor}:${state.houseAccent}`:state.outfit?.toy;
    if(key===signature)return;signature=key;
    if(root){scene.remove(root);disposeHome(root);}
    root=kind==="house"?makeHome(state.skin,state.life,state):makeGroundToy(state.outfit);
    if(kind==="toy"){root.position.y=.4;camera.lookAt(0,.4,0);}scene.add(root);
    container.dataset.skin=state.skin;container.dataset.kind=kind;container.dataset.renderer="webgl";
    draw();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);update(initial);resize();
  return {update,inspect:()=>({renderer:"webgl",kind,skin:state.skin,...root?.userData}),dispose(){if(disposed)return;disposed=true;observer.disconnect();if(root)disposeHome(root);env.dispose();renderer.dispose();renderer.forceContextLoss();container.replaceChildren();}};
}
