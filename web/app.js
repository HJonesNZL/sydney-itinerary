import {config} from './config.js?v=2026111908';
import {fromRows,localLabel} from './model.js?v=2026111908';
import {weatherForDay} from './weather.js?v=2026111908';
import {readSavedSnapshot,saveSnapshot,clearSavedSnapshot,prepareOfflineShell} from './offline.js?v=2026111908';
const $=s=>document.querySelector(s);
// Visual preference uses localStorage; private snapshots use IndexedDB, never tokens.
function setTheme(theme){
 const cobalt=theme==='cobalt';
 document.documentElement.dataset.theme=cobalt?'cobalt':'plum';
 $('#theme-toggle').setAttribute('aria-pressed',String(cobalt));
 $('#theme-toggle').setAttribute('aria-label',cobalt?'Switch to Plum and sage palette':'Switch to Cobalt and apricot palette');
 $('#theme-toggle').title=cobalt?'Switch to Plum':'Switch to Cobalt and apricot';
 $('#theme-name').textContent=cobalt?'Cobalt':'Plum';
 document.querySelector('meta[name="theme-color"]').content=cobalt?'#efe5d8':'#eeeeee';
}
setTheme(document.documentElement.dataset.theme);
try { if(localStorage.getItem('itinerary-colour-theme')==='blush')localStorage.setItem('itinerary-colour-theme','plum'); } catch {}
$('#theme-toggle').onclick=()=>{
 const next=document.documentElement.dataset.theme==='cobalt'?'plum':'cobalt';
 setTheme(next);
 try { localStorage.setItem('itinerary-colour-theme',next); } catch {}
};

let current=[],activeView='itinerary',screenAnimation=null,navigationVersion=0;
let dataVersion=0,lastSync='',savedKind='published',offlineDetected=false,detailItem=null,detailTrigger=null;
const views=new Set(['itinerary','budget','notes','pets']);
const scrollPositions=new Map();
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
let lessMotion=systemMotion.matches;
let dayScroll=null,landingAnimation=null,pressedButton=null;
const feedbackAnimations=new Map();
const sample=[
 {id:'sample-one',title:'A little adventure',start:'2030-01-01T10:00:00',zone:'Australia/Sydney',from:'Your next destination',confirmed:true,notes:'Sample content only. Connect your private sheet to load the published plan.'},
 {id:'sample-two',title:'See where the day goes',start:'2030-01-02T00:00:00',zone:'Australia/Sydney',from:'Somewhere lovely',untimed:true,confirmed:false,notes:'A little space for a spontaneous idea. This is sample content, not your itinerary.'}
];
function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
function motionOff(){return lessMotion||systemMotion.matches||document.hidden;}
function cancelDayJump(){
 if(dayScroll){cancelAnimationFrame(dayScroll.frame);dayScroll=null;}
 if(landingAnimation){landingAnimation.cancel();landingAnimation=null;}
}
function stopFeedback(){for(const animation of feedbackAnimations.values())animation.cancel();feedbackAnimations.clear();pressedButton=null;}
function updateMotion(){
 const off=motionOff();document.documentElement.dataset.motion=off?'off':'on';
 $('#motion').setAttribute('aria-pressed',String(lessMotion));$('#motion').textContent=lessMotion?'Gentle motion is off':'Use less motion';
 if(off){cancelDayJump();stopFeedback();if(screenAnimation)screenAnimation.cancel();document.getAnimations().forEach(a=>a.cancel());}
}
systemMotion.addEventListener('change',updateMotion);updateMotion();
function feedback(node,frames,{duration=220,hold=false}={}){
 const previous=feedbackAnimations.get(node);if(previous)previous.cancel();
 if(motionOff()||!node.animate){feedbackAnimations.delete(node);return;}
 const animation=node.animate(frames,{duration,easing:'cubic-bezier(.2,.8,.25,1)',fill:hold?'forwards':'none',...(node.closest('.view-nav')?{pseudoElement:'::before'}:{})});
 feedbackAnimations.set(node,animation);
 if(!hold)animation.finished.catch(()=>{}).finally(()=>{if(feedbackAnimations.get(node)===animation)feedbackAnimations.delete(node);});
}
function press(node){if(!node||node.disabled)return;pressedButton=node;feedback(node,[{transform:'scale(1)'},{transform:'scale(.975)'}],{duration:85,hold:true});}
function releasePress(cancelled=false){const node=pressedButton;pressedButton=null;if(node)feedback(node,[{transform:'scale(.975)'},{transform:cancelled?'scale(1)':'scale(1.012)',offset:.6},{transform:'scale(1)'}],{duration:cancelled?130:220});}
document.addEventListener('pointerdown',e=>{cancelDayJump();releasePress(true);press(e.target.closest('button'));},{passive:true});
document.addEventListener('pointerup',()=>releasePress());
document.addEventListener('pointercancel',()=>releasePress(true));
document.addEventListener('keydown',e=>{
 if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key))cancelDayJump();
 if(!e.repeat&&['Enter',' '].includes(e.key))press(e.target.closest('button'));
});
document.addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key))releasePress();});
document.addEventListener('click',e=>{const button=e.target.closest('button');if(e.detail===0&&button&&!feedbackAnimations.has(button))feedback(button,[{transform:'scale(.985)'},{transform:'scale(1.01)',offset:.6},{transform:'scale(1)'}]);});
addEventListener('wheel',cancelDayJump,{passive:true});
addEventListener('touchstart',cancelDayJump,{passive:true});
addEventListener('blur',()=>{cancelDayJump();stopFeedback();});
function jumpToDay(day){
 cancelDayJump();
 if(screenAnimation){screenAnimation.cancel();screenAnimation=null;}
 const focus=()=>{const heading=day.querySelector('.day-label');heading.tabIndex=-1;heading.focus({preventScroll:true});};
 const limit=Math.max(0,document.documentElement.scrollHeight-innerHeight);
 const target=Math.max(0,Math.min(limit,scrollY+day.getBoundingClientRect().top-20));
 const start=scrollY,distance=target-start;
 if(motionOff()||Math.abs(distance)<2){scrollTo({top:target,behavior:'instant'});focus();return;}
 // A bounded travel time with a tiny overshoot, never a spring proportional to distance.
 const duration=Math.min(620,Math.max(360,260+Math.sqrt(Math.abs(distance))*6));
 const overshoot=Math.max(0,Math.min(limit,target+Math.sign(distance)*7));
 const job={frame:0,start:null,landed:false};dayScroll=job;
 const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 const tick=now=>{
  if(dayScroll!==job)return;
  if(job.start===null)job.start=now;
  const progress=Math.min(1,(now-job.start)/duration);
  const top=progress<.82?start+(overshoot-start)*ease(progress/.82):overshoot+(target-overshoot)*(1-Math.pow(1-(progress-.82)/.18,3));
  scrollTo({top,behavior:'instant'});
  if(progress>=.82&&!job.landed){
   job.landed=true;
   landingAnimation=day.animate([{transform:'translateY(0)'},{transform:'translateY(3px)',offset:.4},{transform:'translateY(-1px)',offset:.72},{transform:'translateY(0)'}],{duration:210,easing:'ease-out'});
   const animation=landingAnimation;animation.finished.catch(()=>{}).finally(()=>{if(landingAnimation===animation)landingAnimation=null;});
  }
  if(progress<1)job.frame=requestAnimationFrame(tick);
  else{scrollTo({top:target,behavior:'instant'});dayScroll=null;scrollPositions.set(activeView,scrollY);focus();}
 };
 job.frame=requestAnimationFrame(tick);
}
function applyView(name){
 for(const section of document.querySelectorAll('.view'))section.hidden=section.id!==name+'-view';
 for(const button of document.querySelectorAll('[data-view]')){if(button.dataset.view===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
}
function showView(name,{historyMode='push',force=false}={}){
 cancelDayJump();
 if(!views.has(name))name='itinerary';
 if(name===activeView&&!force)return;
 scrollPositions.set(activeView,window.scrollY);
 activeView=name;
 const changeId=++navigationVersion;
 if(historyMode==='push'&&location.hash!=='#'+name)history.pushState({view:name},'','#'+name);
 if(screenAnimation){screenAnimation.cancel();screenAnimation=null;}
 const moveFocus=$('#screen').contains(document.activeElement);
 const update=()=>{if(changeId!==navigationVersion)return;applyView(name);window.scrollTo({top:scrollPositions.get(name)||0,behavior:'instant'});if(moveFocus){const heading=$('#'+name+'-view h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}};
 update();
 if(!motionOff()){
  const animation=$('#screen').animate([{opacity:.7,transform:'translateY(6px)'},{opacity:1,transform:'translateY(-1px)',offset:.78},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
  screenAnimation=animation;
  animation.finished.catch(()=>{}).finally(()=>{if(screenAnimation===animation)screenAnimation=null;});
 }
}
addEventListener('popstate',()=>{if($('#item-dialog').open){$('#item-dialog').close();detailItem=null;detailTrigger?.focus({preventScroll:true});return;}showView(location.hash.slice(1),{historyMode:'none',force:true});});
addEventListener('hashchange',()=>showView(location.hash.slice(1),{historyMode:'none'}));
activeView=views.has(location.hash.slice(1))?location.hash.slice(1):'itinerary';applyView(activeView);
addEventListener('resize',()=>{cancelDayJump();if(screenAnimation){screenAnimation.cancel();screenAnimation=null;}applyView(activeView);});
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>showView(button.dataset.view);
$('#motion').onclick=()=>{lessMotion=!lessMotion;updateMotion();if(motionOff()){document.getAnimations().forEach(a=>a.cancel());applyView(activeView);}};
function money(n){return new Intl.NumberFormat('en-NZ',{style:'currency',currency:'NZD'}).format(n).replace('$','NZ$');}
function totalCost(item){return item.cost*(item.basis==='Per person'?2:1);}
const ICONS={
 paw:['M8.5 13.5c-1.4 1.7-3.5 2.9-3.5 5 0 1.9 1.9 3 3.7 2.2a7.4 7.4 0 0 1 6.6 0c1.8.8 3.7-.3 3.7-2.2 0-2.1-2.1-3.3-3.5-5a4.3 4.3 0 0 0-7 0Z','M6 7.5a2 2.5 0 1 1-4 0 2 2.5 0 1 1 4 0M11 4.5a2 2.5 0 1 1-4 0 2 2.5 0 1 1 4 0M17 4.5a2 2.5 0 1 1-4 0 2 2.5 0 1 1 4 0M22 7.5a2 2.5 0 1 1-4 0 2 2.5 0 1 1 4 0'],
 sun:['M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4','M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
 lock:['M7 10V7a5 5 0 0 1 10 0v3','M5 10h14v11H5z','M12 14v3'],
 arrow:['M6 18 18 6M6 6h12v12'],
 refresh:['M20 7v5h-5','M19.1 6A8 8 0 1 0 20 16'],
 calendar:['M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z','M8 3v4m8-4v4M4 10h16M8 14h2m4 0h2m-8 3h2m4 0h2'],
 wallet:['M4 6h15v14H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13v2','M15 11h6v5h-6zM17 13.5h1'],
 notes:['M5 3h14v18H5z','M9 7h6m-6 5h6m-6 5h4'],
 search:['M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0','m15 15 6 6'],
 close:['m6 6 12 12M6 18 18 6'],
 sparkles:['m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7z'],
 route:['M6 5a2 2 0 1 0 0 .01M18 17a2 2 0 1 0 0 .01','M6 7v4a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3'],
 plane:['m3 10 7 2L18 4c2-2 4 0 2 2l-8 8 2 7-3-1-3-5-5-3z'],
 pin:['M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0','M14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0'],
 boat:['M4 12 12 9l8 3-2 6H6z','M7 11V6h10v5M12 3v3M3 21c2-2 4 2 6 0s4 2 6 0 4 2 6 0'],
 music:['M9 18V5l11-2v13','M9 17c-6-3-8 6-2 4 2-.5 2-2 2-4M20 15c-6-3-8 6-2 4 2-.5 2-2 2-4M9 9l11-2'],
 leaf:['M20 3C7 3 2 9 5 16c7 3 15-2 15-13z','M3 21 15 9'],
 bag:['M4 7h16l-1 14H5z','M8 8V6a4 4 0 0 1 8 0v2'],
 food:['M5 3v7m3-7v7m-6-7v5a3 3 0 0 0 6 0M5 11v10M17 3c-3 3-3 9 0 9h2V3h-2zm2 9v9'],
 check:['m5 12 4 4L19 6'],
 circle:['M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0'],
 chevron:['m7 10 5 5 5-5'],
 phone:['M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z','M10 18h4M10 5h4'],
 cloud:['M6 18a4 4 0 0 1-1-8 7 7 0 0 1 13-1 4.5 4.5 0 0 1 0 9z'],
 rain:['M5 14a3 3 0 0 1 0-6 6 6 0 0 1 11-1 3.5 3.5 0 0 1 1 7','m8 17-1 3m6-3-1 3m6-3-1 3'],
 snow:['M12 3v18M4 7l16 10M4 17 20 7M9 5l3 2 3-2M9 19l3-2 3 2'],
 storm:['M5 14a3 3 0 0 1 0-6 6 6 0 0 1 11-1 3.5 3.5 0 0 1 1 7','m13 12-4 5h4l-2 5 6-8h-4z'],
 sheet:['M5 3h14v18H5z','M5 8h14M5 13h14M5 17h14M10 8v13']
};
function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon');svg.setAttribute('aria-hidden','true');for(const d of ICONS[name]||ICONS.pin){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);}return svg;}
for(const node of document.querySelectorAll('[data-icon]'))node.append(icon(node.dataset.icon));
function activityIcon(item){const text=[item.title,item.transport,item.from].join(' ').toLowerCase();if(item.transport?.toLowerCase()==='flight')return 'plane';if(/cruise|harbour|sailing/.test(text))return 'boat';if(/opera|concert|theatre|music/.test(text))return 'music';if(/beach|coast/.test(text))return 'sun';if(/zoo|encounter|garden|park/.test(text))return 'leaf';if(/shop|store/.test(text))return 'bag';if(/food|market|lunch|dinner|cafe/.test(text))return 'food';return 'pin';}
let selectedDay='';
let snapshotStored=false;
const dateObject=date=>new Date(date+'T12:00:00Z');
function shortDate(date,options={day:'numeric',month:'short'}){return new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',...options}).format(dateObject(date));}
function renderDates(items){
 const root=$('#date-strip');root.replaceChildren();if(!items.length)return;
 const forecast=items.find(i=>i.snapshotWeather)?.snapshotWeather;
 $('#forecast-asof').textContent=forecast?' · forecast saved '+new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Sydney',day:'numeric',month:'short'}).format(new Date(forecast.fetchedAt)):'';
 const first=items[0].start.slice(0,10),last=items.map(i=>i.endDate||i.start.slice(0,10)).sort().at(-1);
 $('#trip-dates').textContent=shortDate(first)+' – '+shortDate(last,{day:'numeric',month:'short',year:'numeric'});
 const start=dateObject(first),finish=dateObject(last),days=Math.round((finish-start)/86400000)+1;
 const counts=new Map();for(const i of items){const date=i.start.slice(0,10);counts.set(date,(counts.get(date)||0)+1);}
 if(!counts.has(selectedDay))selectedDay=first;
 for(let n=0;n<Math.min(days,60);n++){
  const date=new Date(start.getTime()+n*86400000).toISOString().slice(0,10),count=counts.get(date)||0;
  const ongoing=items.filter(i=>i.start.slice(0,10)<date&&i.endDate>=date);
  const button=el('button',null,'date-chip'+(!count&&!ongoing.length?' empty':''));button.dataset.date=date;button.setAttribute('aria-label',shortDate(date,{weekday:'long',day:'numeric',month:'long'})+' · '+(count?count+' plan'+(count===1?'':'s')+' starting':'No plans starting')+(ongoing.length?' · '+ongoing.length+' ongoing':''));
  button.setAttribute('aria-pressed',String(date===selectedDay));button.append(el('span',shortDate(date,{weekday:'short'}).slice(0,1)),el('strong',String(Number(date.slice(-2)))));
  const weather=weatherForDay(forecast,items,date),badge=el('span',null,'day-weather');
  if(weather.available){badge.append(icon(weather.icon),el('span',weather.high+'/'+weather.low+'°C','weather-value'));button.title=weather.location+' · '+weather.label+' · high '+weather.high+'°C, low '+weather.low+'°C · forecast saved '+weather.asOf;}else{badge.textContent='—';badge.classList.add('weather-na');button.title=weather.label;}
  button.setAttribute('aria-label',button.getAttribute('aria-label')+' · '+button.title);button.append(badge);
  button.onclick=()=>{selectedDay=date;for(const b of root.children)b.setAttribute('aria-pressed',String(b.dataset.date===date));$('#overview-title').textContent=shortDate(date,{weekday:'long',day:'numeric',month:'short'});$('#overview-detail').textContent=count+' starting'+(ongoing.length?' · '+ongoing.length+' ongoing':'');const day=document.getElementById('day-'+date)||document.getElementById('day-'+ongoing[0]?.start.slice(0,10));if(day){if($('#search').value){$('#search').value='';filterPlans();}jumpToDay(day);}else{$('#overview-title').textContent=shortDate(date,{weekday:'long',day:'numeric',month:'short'});$('#overview-detail').textContent='No plans this day. Keep it flexible.';}};
  root.append(button);
 }
 $('#overview-title').textContent=items.length+' plans · '+days+' days';$('#overview-detail').textContent=items.filter(i=>i.confirmed).length+' confirmed · '+items.filter(i=>!i.confirmed).length+' tentative';
}
function filterPlans(){const query=$('#search').value.trim().toLocaleLowerCase();let matches=0;for(const card of document.querySelectorAll('.card')){const match=!query||card.dataset.search.includes(query);card.closest('.timeline-item').hidden=!match;if(match)matches++;}for(const day of document.querySelectorAll('.day'))day.hidden=![...day.querySelectorAll('.timeline-item')].some(n=>!n.hidden);$('#search-empty').hidden=matches>0||!query;}
$('#search-toggle').onclick=()=>{const open=$('#search-panel').hidden;$('#search-panel').hidden=!open;$('#search-toggle').setAttribute('aria-expanded',String(open));if(open){if(!motionOff())$('#search-panel').animate([{opacity:.5,transform:'translateY(-3px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'ease-out'});$('#search').focus();}else{$('#search').value='';filterPlans();}};
$('#search').oninput=filterPlans;$('#search-clear').onclick=()=>{$('#search').value='';filterPlans();$('#search').focus();};
$('#search').onkeydown=e=>{if(e.key==='Escape'){$('#search-panel').hidden=true;$('#search-toggle').setAttribute('aria-expanded','false');$('#search').value='';filterPlans();$('#search-toggle').focus();}};
function renderBudget(items,{draft=false}={}){
 const root=$('#budget');root.replaceChildren();const known=items.filter(i=>i.cost!==undefined&&Number.isFinite(i.cost)),total=known.reduce((s,i)=>s+totalCost(i),0);
 const top=el('article',null,'budget-total');top.append(el('span',draft?'Draft costs':lastSync?'Known costs':'Sample preview','eyebrow'),el('strong',known.length?money(total):'Costs to come.'),el('p',`${known.some(i=>i.approx)?'Approximate total. ':''}${items.length-known.length} item(s) unpriced. Includes tentative ideas; this is not a committed-spend total.`));root.append(top);
 if(known.length)root.append(el('p','Included in the total','budget-caption'));
 for(const item of known){const row=el('article',null,'budget-row'),name=el('div');name.append(el('strong',item.title),el('small',`${item.confirmed?'Confirmed':'Tentative'} · ${item.payment||'Payment not noted'}${item.basis==='Per person'?' · two people':' · stated total'}`));row.append(name,el('span',(item.approx?'≈ ':'')+money(totalCost(item))));root.append(row);}
 if(known.length)root.append(el('p','Converted AUD estimates use the dated rate frozen at publish. Unknown prices are excluded.','status'));
}
function render(items,{draft=false}={}){
 cancelDayJump();renderDates(items);const root=$('#plan');root.replaceChildren();const groups=new Map();
 for(const item of items){const date=item.start.slice(0,10);if(!groups.has(date))groups.set(date,[]);groups.get(date).push(item);}
 for(const [date,dayItems] of groups){
  const day=el('section',null,'day');day.id='day-'+date;const heading=el('div',null,'day-heading'),label=el('div',null,'day-label');label.append(el('strong',shortDate(date,{weekday:'long'})),el('span',shortDate(date)));heading.append(label,el('span',dayItems.length+' plan'+(dayItems.length===1?'':'s'),'day-count'));day.append(heading);
  for(const item of dayItems){
   const timeline=el('div',null,'timeline-item'),marker=el('span',null,'activity-icon');marker.setAttribute('aria-hidden','true');marker.append(icon(activityIcon(item)));const card=el('article',null,'card '+(item.confirmed?'confirmed':'tentative'));card.dataset.search=[item.title,item.from,item.to,item.notes,item.transport].join(' ').toLocaleLowerCase();
   const head=el('div',null,'card-head'),tag=el('span',null,'tag');tag.append(icon(item.confirmed?'check':'circle'),document.createTextNode(item.confirmed?'Confirmed':'Tentative'));head.append(tag);if(item.payment)head.append(el('span',item.payment,'payment'));card.append(head);const title=el('h3');if(item.stops?.length){const open=el('button',item.title,'card-title-button');open.setAttribute('aria-haspopup','dialog');open.onclick=()=>openItem(item,open);title.append(open);card.onclick=e=>{if(!e.target.closest('button,a,summary,input,details'))openItem(item,open);};}else title.textContent=item.title;card.append(title);
   const flight=item.transport?.toLowerCase()==='flight'&&item.end,route=el('div',null,'route'+(flight?' flight-route':''));
   for(const [index,[place,time,zone]] of [[item.from,item.start,item.zone],[item.to,item.end,item.endZone]].entries()){
    if(!time)continue;if(flight&&index===1)route.append(icon('plane'));const stop=el('div',null,'stop');
    if(!flight){const location=el('div',null,'stop-location');const name=item.stops?.length===1?el('a',place||'The plan','location-map-link'):el('strong',place||'The plan');if(item.stops?.length===1){name.href=item.stops[0].url;name.target='_blank';name.rel='noopener noreferrer';name.setAttribute('aria-label',(place||item.title)+' · open in Apple Maps');}location.append(icon('pin'),name);stop.append(location);}else stop.append(el('strong',place||'The plan'));
    stop.append(el('span',item.untimed?'Flexible timing':localLabel(time,zone)));
    if(item.untimed&&item.endDate&&item.endDate!==item.start.slice(0,10))stop.append(el('span','Through '+shortDate(item.endDate,{weekday:'short',day:'numeric',month:'short'})));
    route.append(stop);
   }
   card.append(route,el('p',item.cost!==undefined?`${item.approx?'Approximately ':''}${money(item.cost)} · ${item.basis||'Total'}${item.approx?' · rate dated '+item.rateDate:''}`:'Price not added','price'));
   if(!item.stops?.length&&(item.notes||item.transport||item.link)){
    const detail=el('details'),summary=el('summary','Details & links');summary.append(icon('chevron'));detail.append(summary);const body=el('div');
    if(item.transport)body.append(el('p','Getting there · '+item.transport));if(item.notes)body.append(el('p',item.notes));
    if(item.link){try{const u=new URL(item.link);if(u.protocol==='https:'){const a=el('a','Open booking / map');a.append(icon('arrow'));a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';body.append(a);}}catch{}}
    detail.append(body);let disclosureAnimation=null;detail.addEventListener('toggle',()=>{if(disclosureAnimation)disclosureAnimation.cancel();if(detail.open&&!motionOff()&&body.animate){disclosureAnimation=body.animate([{opacity:.5},{opacity:1}],{duration:160,easing:'ease-out'});}});card.append(detail);
   }
   timeline.append(marker,card);day.append(timeline);
  }
  root.append(day);
 }
 root.append(el('p',!items.length?'No published plans yet. Add ideas to the sheet, then publish.':draft?'Unpublished draft · changes stay in the Sheet until publishing.':lastSync?'Saved published plans.':'Sample content · open the published itinerary to load your plans.','empty-note'));
 renderBudget(items,{draft});filterPlans();
}
function openItem(item,trigger){
 cancelDayJump();detailItem=item;detailTrigger=trigger;
 $('#item-dialog-title').textContent=item.title;
 $('#item-dialog-meta').textContent=(item.confirmed?'Confirmed':'Tentative')+' · '+(item.untimed?'Flexible timing':localLabel(item.start,item.zone))+(item.detailsSummary?' · '+item.detailsSummary:'');
 const root=$('#item-stops');root.replaceChildren();const list=el('ul',null,'stops-list');
 function row(stop){const li=el('li');if(stop.children?.length){const group=el('div',null,'stop-group');group.append(el('strong',stop.name),el('small',stop.address));li.append(group);const children=el('ul',null,'stop-branches');for(const child of stop.children)children.append(row(child));li.append(children);}else{const link=el('a',null,'stop-link');link.href=stop.url;link.target='_blank';link.rel='noopener noreferrer';const text=el('span');text.append(el('strong',stop.name),el('small',[stop.address,stop.hint,stop.mapStatus==='place'?'':stop.mapStatus==='address'?'Address pin':'Search link'].filter(Boolean).join(' · ')));link.append(text,icon('arrow'));li.append(link);}return li;}
 for(const stop of item.stops)list.append(row(stop));root.append(list);if(item.notes||item.transport||item.link){const planning=el('details',null,'planning-notes'),summary=el('summary','Planning notes');planning.append(summary);if(item.transport)planning.append(el('p','Getting there · '+item.transport));if(item.notes)planning.append(el('p',item.notes));if(item.link){try{const url=new URL(item.link);if(url.protocol==='https:'){const link=el('a','Open related page');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';planning.append(link);}}catch{}}root.append(planning);}$('#item-more').open=false;
 history.pushState({...history.state,itemDialog:true},'',location.href);$('#item-dialog').showModal();
 if(!motionOff())$('#item-dialog').animate([{opacity:.7,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
}
function closeItem(){if(!$('#item-dialog').open)return;if(history.state?.itemDialog)history.back();else{$('#item-dialog').close();detailItem=null;detailTrigger?.focus({preventScroll:true});}}
$('#item-dialog-close').onclick=closeItem;$('#item-dialog').addEventListener('cancel',e=>{e.preventDefault();closeItem();});
function savedStatus(){if(!lastSync)return navigator.onLine?'Sample preview · open published itinerary':'Offline · open online once to save your plans';const time=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Sydney',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(new Date(lastSync));return (!navigator.onLine||offlineDetected?'Offline':'Saved')+' · synced '+time+(savedKind==='local-review'?' · local review':'')+(snapshotStored?'':' · offline storage unavailable');}
function connectivity(){$('#status').textContent=savedStatus();}
addEventListener('offline',connectivity);addEventListener('online',()=>{offlineDetected=false;if(lastSync)refresh();else connectivity();});
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='shell-offline'||(e.data?.type==='shell-status'&&e.data.offline)){offlineDetected=true;connectivity();}});
async function acceptSavedRows(rows,{kind='published',syncedAt=new Date().toISOString()}={}){const version=dataVersion;const items=fromRows(rows);current=items;lastSync=syncedAt;savedKind=kind;render(items,{draft:kind==='local-review'});try{await saveSnapshot(rows,{kind,syncedAt});snapshotStored=true;}catch{snapshotStored=false;}if(version!==dataVersion)return;$('#signout').hidden=false;$('#signout').textContent='Clear saved';$('#status').textContent=savedStatus();}
async function refresh(){
 const version=++dataVersion;$('#refresh').disabled=true;
 try{const url=new URL(config.snapshotUrl,location.href);if(!config.snapshotUrl||url.origin!==location.origin)throw new Error('Local publication setup pending.');
  const res=await fetch(url,{cache:'no-store',credentials:'omit'});
  if(!res.ok)throw new Error('Published itinerary unavailable.');
  const data=await res.json();const rows=data.rows;fromRows(rows);if(version!==dataVersion)return;offlineDetected=false;await acceptSavedRows(rows,{syncedAt:data.publishedAt||new Date().toISOString()});if(version===dataVersion){$('#connect').hidden=true;$('#refresh').hidden=false;$('#status').textContent='Published snapshot · '+savedStatus().toLowerCase();}
 }catch(e){if(e instanceof TypeError)offlineDetected=true;if(version===dataVersion)$('#status').textContent=lastSync?savedStatus()+' · refresh unavailable':e.message;}finally{if(version===dataVersion)$('#refresh').disabled=false;}
}
async function signout(){++dataVersion;current=[];lastSync='';offlineDetected=false;closeItem();snapshotStored=false;const cleared=clearSavedSnapshot();render(sample);$('#connect').hidden=false;$('#refresh').hidden=true;$('#signout').hidden=true;$('#edit').hidden=true;$('#status').textContent='Clearing saved itinerary…';try{await cleared;$('#status').textContent='Saved itinerary cleared from this browser';}catch{$('#status').textContent='Could not clear saved plans. Remove this site’s data in Safari settings.';}}
$('#connect').onclick=refresh;$('#refresh').onclick=refresh;$('#signout').onclick=signout;
document.addEventListener('visibilitychange',()=>{updateMotion();if(!document.hidden&&lastSync)refresh();});
prepareOfflineShell().then(()=>navigator.serviceWorker.controller?.postMessage({type:'shell-status'}));
const initialVersion=dataVersion;const saved=await readSavedSnapshot();
if(initialVersion===dataVersion){if(saved?.rows){try{current=fromRows(saved.rows);snapshotStored=true;lastSync=saved.syncedAt;savedKind=saved.kind||'published';render(current,{draft:savedKind==='local-review'});$('#signout').hidden=false;$('#signout').textContent='Clear saved';$('#refresh').hidden=false;$('#status').textContent=savedStatus();}catch{render(sample);}}else render(sample);}

if(config.autoLoad&&!lastSync){render([]);$('#plan .empty-note').textContent='Loading your itinerary…';}
if(config.autoLoad||(lastSync&&savedKind!=='local-review'))refresh();
