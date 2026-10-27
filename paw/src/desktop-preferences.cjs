const https = require('node:https');
function fullscreen(value, displays, convert = p=>p){
 if(!value?.supported||!value.bounds||/^(paw|electron|explorer|finder|windowserver)$/i.test(value.name||''))return false;
 const b=value.bounds,p=convert({x:b.x,y:b.y}),q=convert({x:b.x+b.width,y:b.y+b.height});
 return displays.some(d=>p.x<=d.bounds.x+2&&p.y<=d.bounds.y+2&&q.x>=d.bounds.x+d.bounds.width-2&&q.y>=d.bounds.y+d.bounds.height-2);
}
function newer(a,b){const parse=s=>/^\d+\.\d+\.\d+$/.test(s||'')?s.split('.').map(Number):null;const x=parse(a),y=parse(b);if(!x||!y)return false;for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;}
function checkRelease(current){
 return new Promise(resolve=>{
  const req=https.get('https://api.github.com/repos/dolaruslan872-alt/354345/releases/latest',{headers:{'User-Agent':'Paw/0.7.1','Accept':'application/vnd.github+json'}},res=>{
   if(res.statusCode!==200){res.resume();resolve({ok:false,code:res.statusCode});return;}
   let data='';res.setEncoding('utf8');res.on('data',chunk=>{data+=chunk;if(data.length>262144)req.destroy(new Error('Release response too large'));});
   res.on('end',()=>{try{const r=JSON.parse(data),version=String(r.tag_name||'').replace(/^v/,'');resolve({ok:true,available:newer(version,current),version});}catch{resolve({ok:false});}});
  });req.setTimeout(8000,()=>req.destroy(new Error('timeout')));req.on('error',()=>resolve({ok:false}));
 });
}
module.exports={fullscreen,newer,checkRelease};
