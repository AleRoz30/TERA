/* ==============================
   TERA MVP — FULL PATCHED JS
   sector images + template + export/import
============================== */

/* ---------- helpers ---------- */
const nowIso = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const el = id => document.getElementById(id);

/* ---------- constants ---------- */
const FUNCTION_NAMES_12 = [
  "1 Импульс","2 Ввод","3 Контакт","4 Различение",
  "5 Формирование","6 Связность","7 Конфликт",
  "8 Согласование","9 Реализация","10 Контроль",
  "11 Завершение","12 Осмысление"
];

const FUNCTION_GROUPS_4 = [
  {name:"A Ориентация", funcs:[1,2,3]},
  {name:"B Различение", funcs:[4,5,6]},
  {name:"C Решение", funcs:[7,8,9]},
  {name:"D Завершение", funcs:[10,11,12]}
];

/* ---------- DB ---------- */
const DB_NAME = "tera_db";
const STORE = "maps";

function openDB(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"id"});
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
  });
}
async function dbPut(map){
  const db=await openDB();
  const tx=db.transaction(STORE,"readwrite");
  tx.objectStore(STORE).put(map);
}
async function dbGetAll(){
  const db=await openDB();
  const tx=db.transaction(STORE,"readonly");
  return new Promise(r=>tx.objectStore(STORE).getAll().onsuccess=e=>r(e.target.result||[]));
}

/* ---------- model ---------- */
function newMap(){
  return {
    id: uid(),
    title: "TERA карта",
    sector_mode: "12",
    layer_mode: "all",
    created_at: nowIso(),
    updated_at: nowIso(),
    sector_images: {},      // ⭐ ключевой патч
    nodes: [],
    edges: []
  };
}

/* ---------- Lachinyan template ---------- */
const LACHINYAN_TEMPLATE = {
  title: "Шаблон Лачиняна",
  sector_mode: "12",
  layer_mode: "all",
  sector_images: {},
  nodes: FUNCTION_NAMES_12.map((n,i)=>({
    id: uid(),
    title: n,
    synopsis: "—",
    function_id: i+1,
    position:{x:0,y:0},
    created_at: nowIso(),
    updated_at: nowIso()
  })),
  edges:[]
};

/* ---------- state ---------- */
const state = {
  map: newMap(),
  hoverSector: null,
  view:{cx:0,cy:0,s:1}
};

/* ---------- canvas ---------- */
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");

function resize(){
  const r=cv.getBoundingClientRect();
  cv.width=r.width*devicePixelRatio;
  cv.height=r.height*devicePixelRatio;
  draw();
}
window.addEventListener("resize",resize);

/* ---------- geometry ---------- */
function sectorCount(){ return state.map.sector_mode==="4"?4:12; }

function sectorFromScreen(x,y){
  const r=cv.getBoundingClientRect();
  const cx=r.width/2, cy=r.height/2;
  const dx=x-cx, dy=y-cy;
  const dist=Math.hypot(dx,dy);

  const R=Math.min(r.width,r.height)*0.34;
  const Rin=R*0.45;
  if(dist<Rin||dist>R) return null;

  let ang=Math.atan2(dy,dx)+Math.PI/2;
  if(ang<0) ang+=Math.PI*2;
  const idx=Math.floor(ang/(Math.PI*2/sectorCount()));

  if(state.map.sector_mode==="4")
    return FUNCTION_GROUPS_4[idx]?.funcs[0]||null;
  return idx+1;
}

/* ---------- sector image actions ---------- */
function openSectorImageDialog(fid){
  const i=document.createElement("input");
  i.type="file"; i.accept="image/*";
  i.onchange=()=>{
    const f=i.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      state.map.sector_images[fid]=r.result;
      state.map.updated_at=nowIso();
      dbPut(state.map);
      draw();
    };
    r.readAsDataURL(f);
  };
  i.click();
}

function deleteSectorImage(fid){
  if(!state.map.sector_images[fid]) return;
  delete state.map.sector_images[fid];
  state.map.updated_at=nowIso();
  dbPut(state.map);
  draw();
}

/* ---------- export / import images ---------- */
function exportSectorImages(){
  const blob=new Blob([JSON.stringify({
    type:"tera-sector-images",
    images:state.map.sector_images
  },null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="tera-sector-images.json";
  a.click();
}

function importSectorImages(file){
  const r=new FileReader();
  r.onload=()=>{
    const d=JSON.parse(r.result);
    if(d.type!=="tera-sector-images") return;
    state.map.sector_images=d.images||{};
    state.map.updated_at=nowIso();
    dbPut(state.map);
    draw();
  };
  r.readAsText(file);
}

/* ---------- draw ---------- */
function draw(){
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  const r=cv.getBoundingClientRect();
  ctx.clearRect(0,0,r.width,r.height);

  const cx=r.width/2, cy=r.height/2;
  const R=Math.min(r.width,r.height)*0.34;
  const Rin=R*0.45;
  const n=sectorCount();
  const start=-Math.PI/2;

  ctx.strokeStyle="rgba(180,180,200,.25)";
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.arc(cx,cy,Rin,0,Math.PI*2); ctx.stroke();

  for(let i=0;i<n;i++){
    const a=start+i*(Math.PI*2/n);
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*Rin,cy+Math.sin(a)*Rin);
    ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);
    ctx.stroke();
  }

  for(let i=0;i<n;i++){
    const fid=state.map.sector_mode==="4"
      ?FUNCTION_GROUPS_4[i]?.funcs[0]:i+1;
    const src=state.map.sector_images[fid];
    if(!src) continue;

    const am=start+(i+0.5)*(Math.PI*2/n);
    const rm=(R+Rin)/2;
    const x=cx+Math.cos(am)*rm;
    const y=cy+Math.sin(am)*rm;

    const img=new Image();
    img.src=src;
    img.onload=()=>{
      ctx.save();
      ctx.globalAlpha=0.15;
      ctx.drawImage(img,x-24,y-24,48,48);
      ctx.restore();
    };
  }

  if(state.hoverSector){
    ctx.fillStyle="rgba(200,220,255,.85)";
    ctx.font="12px system-ui";
    ctx.fillText(
      "Клик — задать образ · Shift+клик — удалить",
      12,r.height-12
    );
  }
}

/* ---------- interaction ---------- */
cv.addEventListener("mousedown",ev=>{
  const r=cv.getBoundingClientRect();
  const x=ev.clientX-r.left;
  const y=ev.clientY-r.top;
  const fid=sectorFromScreen(x,y);
  if(fid){
    ev.shiftKey?deleteSectorImage(fid):openSectorImageDialog(fid);
  }
});

cv.addEventListener("mousemove",ev=>{
  const r=cv.getBoundingClientRect();
  const x=ev.clientX-r.left;
  const y=ev.clientY-r.top;
  state.hoverSector=sectorFromScreen(x,y);
  draw();
});

/* ---------- init ---------- */
(async function(){
  resize();
  const maps=await dbGetAll();
  if(maps[0]) state.map=maps[0];
  else{
    state.map={...newMap(),...LACHINYAN_TEMPLATE};
    await dbPut(state.map);
  }
  draw();
})();
