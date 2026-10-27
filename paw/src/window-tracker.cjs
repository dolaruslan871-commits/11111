'use strict';
const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');

// One lightweight native observer is active only while the pointer is near the
// pet, during pickup/descent, or while sitting on a window. No subprocess/frame.
function windowsScript(selfPid) {
  return `$ErrorActionPreference='Stop'; Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
public class PawWindows063 {
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int L,T,R,B; }
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb,IntPtr p);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out Rect r);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h,uint c);
  [DllImport("dwmapi.dll",EntryPoint="DwmGetWindowAttribute")] static extern int Frame(IntPtr h,int a,out Rect r,int n);
  [DllImport("dwmapi.dll",EntryPoint="DwmGetWindowAttribute")] static extern int Cloak(IntPtr h,int a,out int v,int n);
  public static string[] Read(int self) {
    var result=new List<string>();
    EnumWindows(delegate(IntPtr h,IntPtr unused) {
      if(!IsWindowVisible(h)||IsIconic(h)||GetWindow(h,4)!=IntPtr.Zero)return true;
      uint pid;GetWindowThreadProcessId(h,out pid);if(pid==self)return true;
      int cloaked;try{if(Cloak(h,14,out cloaked,4)==0&&cloaked!=0)return true;}catch{}
      Rect r;if(!GetWindowRect(h,out r))return true;
      try { Rect f;if(Frame(h,9,out f,Marshal.SizeOf(typeof(Rect)))==0)r=f; }catch{}
      if(r.R-r.L<60||r.B-r.T<35)return true;
      string name="";try{name=Process.GetProcessById((int)pid).ProcessName;}catch{}
      result.Add(h.ToInt64()+"|"+pid+"|"+r.L+"|"+r.T+"|"+(r.R-r.L)+"|"+(r.B-r.T)+"|"+name);
      return true;
    },IntPtr.Zero);
    return result.ToArray();
  }
}
'@; while($true){$v=@([PawWindows063]::Read(${selfPid})); ConvertTo-Json -InputObject $v -Compress; Start-Sleep -Milliseconds 500}`;
}
function macScript(selfPid) {
  return `ObjC.import('Cocoa'); ObjC.import('CoreGraphics');
const output=$.NSFileHandle.fileHandleWithStandardOutput;
while(true){try{
 const raw=ObjC.deepUnwrap($.CGWindowListCopyWindowInfo(17,0));
 const rows=raw.filter(w=>w.kCGWindowLayer===0&&w.kCGWindowOwnerPID!==${selfPid}&&w.kCGWindowAlpha!==0).map(w=>({id:String(w.kCGWindowNumber),pid:w.kCGWindowOwnerPID,name:w.kCGWindowOwnerName||'',bounds:{x:w.kCGWindowBounds.X,y:w.kCGWindowBounds.Y,width:w.kCGWindowBounds.Width,height:w.kCGWindowBounds.Height}}));
 const text=$(JSON.stringify(rows)+'\\n');output.writeData(text.dataUsingEncoding($.NSUTF8StringEncoding));
 }catch(e){const text=$('null\\n');output.writeData(text.dataUsingEncoding($.NSUTF8StringEncoding));}
 $.NSThread.sleepForTimeInterval(.5);
}`;
}
function normalizeWindows(value, platform, selfPid) {
  if (!Array.isArray(value)) return null;
  const result = [];
  for (const entry of value.slice(0, 512)) {
    let item = entry;
    if (platform === 'win32' && typeof entry === 'string') {
      const [id,pid,x,y,width,height,name] = entry.split('|');
      item = { id, pid: +pid, name, bounds: { x:+x,y:+y,width:+width,height:+height } };
    }
    if (!item || typeof item !== 'object' || !item.id || item.pid === selfPid) continue;
    const b = item.bounds;
    if (!b || !['x','y','width','height'].every(k=>Number.isFinite(b[k])) || b.width < 60 || b.height < 35) continue;
    if (/^(Paw|paw-desktop-pet)$/i.test(item.name || '')) continue;
    result.push({ id: String(item.id).slice(0,100), pid: item.pid, name: String(item.name || '').slice(0,150), bounds: { ...b }, visible: true, minimized: false });
  }
  return result;
}
function createWindowTracker({ platform = process.platform, selfPid = process.pid, spawnProcess = spawn, now = Date.now } = {}) {
  const events = new EventEmitter();
  let worker = null, generation = 0, buffer = '', failedAt = -Infinity;
  let value = { supported: false, windows: [], observedAt: 0, coordinateSpace: platform === 'win32' ? 'screen' : 'dip' };
  function start() {
    if (worker || !['darwin','win32'].includes(platform) || now()-failedAt < 15000) return;
    const ownGeneration = ++generation;
    const file = platform === 'win32' ? 'powershell.exe' : '/usr/bin/osascript';
    const source = platform === 'win32' ? windowsScript(selfPid) : macScript(selfPid);
    const args = platform === 'win32'
      ? ['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(source,'utf16le').toString('base64')]
      : ['-l','JavaScript','-e',source];
    try { worker = spawnProcess(file,args,{windowsHide:true,stdio:['ignore','pipe','pipe']}); }
    catch { failedAt=now(); return; }
    const child=worker; buffer='';
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data',chunk=>{
      if(ownGeneration!==generation)return;
      buffer+=chunk;
      if(buffer.length>2*1024*1024){stop();failedAt=now();return;}
      let boundary;
      while((boundary=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,boundary).trim();buffer=buffer.slice(boundary+1);
        try{
          const windows=normalizeWindows(JSON.parse(line),platform,selfPid);
          if(windows){value={supported:true,windows,observedAt:now(),coordinateSpace:platform==='win32'?'screen':'dip'};events.emit('snapshot',value);}
        }catch{}
      }
    });
    // Consume stderr without exposing application titles or accumulating data.
    child.stderr?.on('data',()=>{});
    const exited=()=>{if(ownGeneration===generation){worker=null;failedAt=now();}};
    child.once('error',exited);child.once('exit',exited);
  }
  function stop() {
    generation++; const child=worker;worker=null;buffer='';
    if(child){try{child.kill();}catch{}}
  }
  function snapshot() {
    if(now()-value.observedAt>2500)return {...value,supported:false};
    return value;
  }
  return { start, stop, snapshot, events };
}
module.exports={createWindowTracker,normalizeWindows,windowsScript,macScript};
