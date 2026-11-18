import {config} from './config.js?v=20261118';
import {fromRows,localLabel} from './model.js?v=20261118';
const $=s=>document.querySelector(s);
const SHEETS_READ_SCOPE='https://www.googleapis.com/auth/spreadsheets.readonly';
let token='',expires=0,current=[],activeView='itinerary',transition=null,screenAnimation=null,navigationVersion=0;
const views=new Set(['itinerary','budget','notes']);
const scrollPositions=new Map();
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
let lessMotion=systemMotion.matches;
const sample=[
 {id:'sample-one',title:'A little adventure',start:'2030-01-01T10:00:00',zone:'Australia/Sydney',from:'Your next destination',confirmed:true,notes:'Sample content only. Connect your private sheet to load the published plan.'},
 {id:'sample-two',title:'See where the day goes',start:'2030-01-02T00:00:00',zone:'Australia/Sydney',from:'Somewhere lovely',untimed:true,confirmed:false,notes:'A little space for a spontaneous idea. This is sample content, not your itinerary.'}
];
function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
function motionOff(){return lessMotion||systemMotion.matches||document.hidden;}
function updateMotion(){document.documentElement.dataset.motion=motionOff()?'off':'on';$('#motion').setAttribute('aria-pressed',String(lessMotion));$('#motion').textContent=lessMotion?'Gentle motion is off':'Use less motion';}
systemMotion.addEventListener('change',updateMotion);updateMotion();
function bounce(node){if(!motionOff()&&node.animate)node.animate([{transform:'scale(.96)'},{transform:'scale(1.025)',offset:.6},{transform:'scale(1)'}],{duration:360,easing:'cubic-bezier(.2,.7,.3,1)',...(node.closest('.view-nav')?{pseudoElement:'::before'}:{})});}
document.addEventListener('click',e=>{const target=e.target.closest('button');if(target)bounce(target);});
function applyView(name){
 for(const section of document.querySelectorAll('.view'))section.hidden=section.id!==name+'-view';
 for(const button of document.querySelectorAll('[data-view]')){if(button.dataset.view===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
}
function showView(name,{historyMode='push',force=false}={}){
 if(!views.has(name))name='itinerary';
 if(name===activeView&&!force)return;
 scrollPositions.set(activeView,window.scrollY);
 activeView=name;
 const changeId=++navigationVersion;
 if(historyMode==='push'&&location.hash!=='#'+name)history.pushState({view:name},'','#'+name);
 if(transition){transition.skipTransition();transition=null;}
 if(screenAnimation){screenAnimation.cancel();screenAnimation=null;}
 const moveFocus=$('#screen').contains(document.activeElement);
 const update=()=>{if(changeId!==navigationVersion)return;applyView(name);window.scrollTo({top:scrollPositions.get(name)||0,behavior:'instant'});if(moveFocus){const heading=$('#'+name+'-view h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}};
 if(motionOff()){update();return;}
 // WebKit misplaces captured content when the document scroll changes in update.
 // Use the live entrance animation for scroll restoration, retaining native page scrolling.
 const restoresScroll=Math.abs(window.scrollY-(scrollPositions.get(name)||0))>1;
 if(document.startViewTransition&&!restoresScroll){
  const next=document.startViewTransition(update);transition=next;
  next.ready.catch(()=>{}); // A resize or newer tap may intentionally skip capture.
  next.finished.catch(()=>{}).finally(()=>{if(transition===next)transition=null;});
 }else{update();screenAnimation=$('#screen').animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'ease-out'});}
}
addEventListener('popstate',()=>showView(location.hash.slice(1),{historyMode:'none',force:true}));
addEventListener('hashchange',()=>showView(location.hash.slice(1),{historyMode:'none'}));
activeView=views.has(location.hash.slice(1))?location.hash.slice(1):'itinerary';applyView(activeView);
addEventListener('resize',()=>{if(transition){transition.skipTransition();transition=null;}applyView(activeView);});
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>showView(button.dataset.view);
$('#motion').onclick=()=>{lessMotion=!lessMotion;updateMotion();if(motionOff()){if(transition)transition.skipTransition();document.getAnimations().forEach(a=>a.cancel());applyView(activeView);}};
function money(n){return new Intl.NumberFormat('en-NZ',{style:'currency',currency:'NZD'}).format(n).replace('$','NZ$');}
function totalCost(item){return item.cost*(item.basis==='Per person'?2:1);}
function renderBudget(items,{draft=false}={}){const root=$('#budget');root.replaceChildren();const known=items.filter(i=>i.cost!==undefined&&Number.isFinite(i.cost));const total=known.reduce((s,i)=>s+totalCost(i),0);const top=el('article',null,'budget-total');top.append(el('span',draft?'Draft costs':token?'Known costs':'Sample preview','eyebrow'),el('strong',known.length?money(total):'Costs to come.'),el('p',`${known.some(i=>i.approx)?'Approximate total. ':''}${items.length-known.length} item(s) unpriced. Includes tentative ideas; this is not a committed-spend total.`));root.append(top);for(const item of known){const row=el('article',null,'budget-row');const name=el('div');name.append(el('strong',item.title),el('small',`${item.confirmed?'Confirmed':'Tentative'} · ${item.payment||'Payment not noted'}${item.basis==='Per person'?' · two people':' · stated total'}`));row.append(name,el('span',(item.approx?'≈ ':'')+money(totalCost(item))));root.append(row);}if(known.length)root.append(el('p','Converted AUD estimates use the dated rate frozen at publish. Unknown prices are excluded.','status'));}
function render(items,{draft=false}={}){const root=$('#plan');root.replaceChildren();for(const item of items){const day=el('section',null,'day');const date=new Date(item.start.slice(0,10)+'T12:00:00Z');const label=el('div',null,'day-label');label.append(el('strong',new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',timeZone:'UTC'}).format(date)),el('span',new Intl.DateTimeFormat('en-AU',{weekday:'long',timeZone:'UTC'}).format(date)));const card=el('article',null,'card '+(item.confirmed?'confirmed':'tentative'));card.append(el('span',item.confirmed?'● Confirmed':'○ Tentative','tag'));if(item.payment)card.append(el('span',item.payment,'payment'));card.append(el('h3',item.title));const route=el('div',null,'route'+(item.end?'':' single'));for(const [place,time,zone] of [[item.from,item.start,item.zone],[item.to,item.end,item.endZone]]){if(!time)continue;const stop=el('div',null,'stop');stop.append(el('strong',place||'The plan'),el('span',item.untimed?'Time to be decided':localLabel(time,zone)));route.append(stop);}card.append(route);card.append(el('p',item.cost!==undefined?`${item.approx?'Approximately ':''}${money(item.cost)} · ${item.basis||'Total'}${item.approx?' · rate dated '+item.rateDate:''}`:'Cost not added yet','price'));if(item.notes||item.transport||item.link){const detail=el('details');detail.append(el('summary','Details & booking'));const body=el('div');if(item.transport)body.append(el('p','Getting there · '+item.transport));if(item.notes)body.append(el('p',item.notes));if(item.link){try{const u=new URL(item.link);if(u.protocol==='https:'){const a=el('a','Open booking / map ↗');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';body.append(a);}}catch{}}detail.append(body);detail.addEventListener('toggle',()=>{if(detail.open&&!motionOff()&&body.animate)body.animate([{opacity:0,transform:'translateY(-5px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:'ease-out'});});card.append(detail);}day.append(label,card);root.append(day);}if(!items.length)root.append(el('p','No published plans yet. Add ideas to the sheet, then publish.','empty-note'));else root.append(el('p',draft?'Unpublished draft · changes stay in the Sheet until publishing.':token?'Add ideas in the sheet.':'Sample content · sign in to load your itinerary.','empty-note'));renderBudget(items,{draft});}
async function refresh(){if(!token||Date.now()>=expires){signout();$('#status').textContent='Sign in again to refresh your private itinerary.';return;}$('#refresh').disabled=true;try{const url=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/Published!A1%3AT1000`;const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});if(!res.ok)throw new Error(res.status===403?'This Google account does not have sheet access.':res.status===401?'Your sign-in expired. Sign out and reconnect.':'Could not load the published snapshot.');const data=await res.json();current=fromRows(data.values||[]);render(current);$('#status').textContent='Published snapshot · checked '+new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Sydney',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date())+' · Scratch drafts stay in the sheet.';}catch(e){$('#status').textContent=e.message+' '+(current.length?'Keeping the last successfully loaded view.':'');}finally{$('#refresh').disabled=false;}}
function signout(){token='';expires=0;current=[];render(sample);$('#connect').hidden=false;$('#refresh').hidden=true;$('#signout').hidden=true;$('#edit').hidden=true;$('#status').textContent='Signed out · sample content only';}
$('#connect').onclick=()=>{if(!config.clientId||!config.spreadsheetId){$('#status').textContent='Private setup needed: configure Google sign-in and the sheet. This preview contains sample content only.';return;}if(!window.google?.accounts?.oauth2){$('#status').textContent='Google sign-in is still loading. Check your connection and try again.';return;}const client=google.accounts.oauth2.initTokenClient({client_id:config.clientId,scope:SHEETS_READ_SCOPE,include_granted_scopes:false,callback:r=>{if(r.error){$('#status').textContent='Google sign-in was not completed.';return;}if(!r.access_token||!Number.isFinite(Number(r.expires_in))||Number(r.expires_in)<=0||!google.accounts.oauth2.hasGrantedAllScopes(r,SHEETS_READ_SCOPE)){$('#status').textContent='Google Sheets read access was not granted. Reconnect to try again.';return;}token=r.access_token;expires=Date.now()+Number(r.expires_in)*1000;$('#connect').hidden=true;$('#refresh').hidden=false;$('#signout').hidden=false;$('#edit').href=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(config.spreadsheetId)}/edit`;$('#edit').hidden=false;refresh();},error_callback:()=>$('#status').textContent='Sign-in window closed. Try again in Safari.'});client.requestAccessToken();};
$('#refresh').onclick=refresh;$('#signout').onclick=signout;
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&token)refresh();});render(sample);
