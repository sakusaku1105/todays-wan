// ============================================================
// Today's Wan! アプリの処理
// ============================================================
(function(){
"use strict";
// 基準日：2026年1月1日（JST）＝ DOGS[0]（柴犬）
const BASE = { y: 2026, m: 1, d: 1};
const FAV_KEY = "todays-wan-favorites";

// JST（日本時間）の今日を {y,m,d} で返す
function jstToday(){
const s = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const [y,m,d] = s.split("-").map(Number); return {y,m,d};
}
// 日付の差（日数）を UTC 基準で安全に計算
function daysDiff(a,b){ return Math.round((Date.UTC(b.y,b.m-1,b.d)-Date.UTC(a.y,a.m-1,a.d))/86400000);}
function addDays(date,n){ const t=new Date(Date.UTC(date.y,date.m-1,date.d)+n*86400000); return {y:t.getUTCFullYear(),m:t.getUTCMonth()+1,d:t.getUTCDate()};}
function fmt(date){ return `${date.y}年${date.m}月${date.d}日`;}
function iso(date){ return `${date.y}-${String(date.m).padStart(2,"0")}-${String(date.d).padStart(2,"0")}`;}
// その日の犬種（負の日数でも正しく回るよう mod を調整）
function dogForDate(date){
const idx = ((daysDiff(BASE,date) % DOGS.length) + DOGS.length) % DOGS.length;
return DOGS[idx];
}
function parseDateParam(v){
const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v||""); if(!m) return null;
return {y:+m[1], m:+m[2], d:+m[3]};
}

// ---- お気に入り（LocalStorage）----
function loadFavs(){ try{ const v=JSON.parse(localStorage.getItem(FAV_KEY)); return Array.isArray(v)?v:[];}catch(e){ return [];}}
function saveFavs(f){ localStorage.setItem(FAV_KEY, JSON.stringify(f));}
function isFav(id){ return loadFavs().includes(id);}
function toggleFav(id){ let f=loadFavs(); f = f.includes(id)? f.filter(x=>x!==id): [...f,id]; saveFavs(f); return f.includes(id);}

// ---- 画面切り替え ----
let lastView = "today";
function show(view){
document.querySelectorAll(".view").forEach(el=>el.classList.remove("active"));
document.getElementById("view-"+view).classList.add("active");
document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.view===view));
if(view!=="detail") lastView = view;
window.scrollTo({top:0});
if(view==="fav") renderFavs();
if(view==="past") renderPast();
}
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>show(t.dataset.view)));

function tagsHtml(dog){ return dog.tags.map(t=>`<span>#${t}</span>`).join("");}
function favLabel(id){ return isFav(id)? "♥ お気に入り済み": "♡ お気に入り";}
function updateFavBtn(btn,id){ btn.textContent=favLabel(id); btn.classList.toggle("is-fav", isFav(id));}

// ---- 今日のワンちゃん ----
const params = new URLSearchParams(location.search);
const todayDate = parseDateParam(params.get("date")) || jstToday();
const todayDog = dogForDate(todayDate);
let currentDetailId = todayDog.id;

function renderToday(){
document.getElementById("today-date").textContent = fmt(todayDate) + "（" + "日月火水木金土"[new Date(Date.UTC(todayDate.y,todayDate.m-1,todayDate.d)).getUTCDay()] + "）";
const img=document.getElementById("today-img"); img.src=todayDog.image; img.alt=todayDog.name+"のイラスト";
document.getElementById("today-name").textContent = todayDog.name;
document.getElementById("today-personality").textContent = todayDog.personality;
document.getElementById("today-tags").innerHTML = tagsHtml(todayDog);
document.getElementById("today-message").textContent = "「" + todayDog.message + "」";
updateFavBtn(document.getElementById("today-fav"), todayDog.id);
// シェアリンク
const shareUrl = new URL(location.href); shareUrl.search = "?dog="+todayDog.id;
const text = `今日のワンちゃんは🐶「${todayDog.message}」 #TodaysWan`;
document.getElementById("share-x").href = "https://twitter.com/intent/tweet?text="+encodeURIComponent(text)+"&url="+encodeURIComponent(shareUrl.href);
document.getElementById("share-line").href = "https://social-plugins.line.me/lineit/share?url="+encodeURIComponent(shareUrl.href)+"&text="+encodeURIComponent(text);
const nativeBtn=document.getElementById("share-native");
if(navigator.share){ nativeBtn.hidden=false; nativeBtn.onclick=()=>navigator.share({title:"Today's Wan!",text,url:shareUrl.href}).catch(()=>{});}
document.getElementById("share-copy").onclick = async ()=>{
const msg=document.getElementById("copy-msg");
try{ await navigator.clipboard.writeText(shareUrl.href); msg.textContent="リンクをコピーしました♪";}
catch(e){ msg.textContent=shareUrl.href;}
setTimeout(()=>msg.textContent="",3000);
};
}
document.getElementById("today-fav").addEventListener("click",e=>{ toggleFav(todayDog.id); updateFavBtn(e.currentTarget,todayDog.id);});
document.getElementById("today-detail").addEventListener("click",()=>openDetail(todayDog.id));

// ---- 図鑑 ----
function miniCard(dog){
const b=document.createElement("button"); b.className="mini-card"; b.type="button";
b.innerHTML=`<img src="${dog.image}" alt="${dog.name}のイラスト"><strong>${dog.name}</strong><small>${dog.tags[0]||""}</small>`;
b.addEventListener("click",()=>openDetail(dog.id)); return b;
}
const grid=document.getElementById("zukan-grid"); DOGS.forEach(d=>grid.appendChild(miniCard(d)));

// ---- お気に入り一覧 ----
function renderFavs(){
const wrap=document.getElementById("fav-grid"); wrap.innerHTML="";
const favs=loadFavs(); document.getElementById("fav-empty").hidden = favs.length>0;
DOGS.filter(d=>favs.includes(d.id)).forEach(d=>wrap.appendChild(miniCard(d)));
}

// ---- 過去30日 ----
function renderPast(){
const wrap=document.getElementById("past-list"); wrap.innerHTML="";
for(let i=1;i<=30;i++){
const date=addDays(todayDate,-i); const dog=dogForDate(date);
const b=document.createElement("button"); b.className="past-item"; b.type="button";
b.innerHTML=`<img src="${dog.image}" alt="${dog.name}のイラスト"><span><strong>${dog.name}</strong><br><span class="d">${fmt(date)}</span></span>`;
b.addEventListener("click",()=>openDetail(dog.id)); wrap.appendChild(b);
}
}

// ---- 詳細 ----
function openDetail(id){
const dog=DOGS.find(d=>d.id===id) || todayDog; currentDetailId=dog.id;
const img=document.getElementById("detail-img"); img.src=dog.image; img.alt=dog.name+"のイラスト";
document.getElementById("detail-name").textContent=dog.name;
document.getElementById("detail-personality").textContent=dog.personality;
document.getElementById("detail-tags").innerHTML=tagsHtml(dog);
document.getElementById("detail-intro").textContent=dog.intro;
document.getElementById("detail-message").textContent="「"+dog.message+"」";
updateFavBtn(document.getElementById("detail-fav"), dog.id);
show("detail");
}
document.getElementById("detail-fav").addEventListener("click",e=>{ toggleFav(currentDetailId); updateFavBtn(e.currentTarget,currentDetailId); updateFavBtn(document.getElementById("today-fav"),todayDog.id);});
document.getElementById("detail-back").addEventListener("click",()=>show(lastView));

// ---- 初期表示：?dog= があればその子の詳細を開く ----
renderToday(); renderPast();
const dogParam=params.get("dog");
if(dogParam && DOGS.some(d=>d.id===dogParam)) openDetail(dogParam);

// ---- 0時（JST）を過ぎたら今日画面を自動更新 ----
let currentDayKey = iso(jstToday());
setInterval(()=>{ const k=iso(jstToday()); if(k!==currentDayKey &&!params.get("date")) location.reload();}, 60000);
})();
