const navLinks=[...document.querySelectorAll('.nav-link')];
function setActive(id){navLinks.forEach(link=>{const active=link.dataset.section===id;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')})}
const observed=['days','activities','flights','hotel','weather','security'].map(id=>document.getElementById(id)).filter(Boolean);
const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible)setActive(visible.target.id)}, {rootMargin:'-18% 0px -58% 0px',threshold:[0,.15,.35,.6]});
observed.forEach(section=>observer.observe(section));
const weatherDays=document.getElementById('weather-days'),weatherStatus=document.getElementById('weather-status'),weatherAdvice=document.getElementById('weather-advice-text'),refreshButton=document.getElementById('refresh-weather');
const startDate='2026-10-28',endDate='2026-10-30';
function weatherDescription(code){if(code===0)return['Clear sky','☀️'];if([1,2].includes(code))return['Mostly clear','🌤️'];if(code===3)return['Cloudy','☁️'];if([45,48].includes(code))return['Foggy','🌫️'];if([51,53,55,56,57].includes(code))return['Drizzle','🌦️'];if([61,63,65,66,67,80,81,82].includes(code))return['Rain likely','🌧️'];if([71,73,75,77,85,86].includes(code))return['Wintry showers','🌨️'];if([95,96,99].includes(code))return['Thunderstorms','⛈️'];return['Mixed conditions','🌥️']}
function dateLabel(s){return new Date(s+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}).toUpperCase()}
function adviceFor(days){const rain=Math.max(...days.map(d=>d.rain??0)),min=Math.min(...days.map(d=>d.min)),max=Math.max(...days.map(d=>d.max));if(rain>=50)return'Rain is possible on at least one day: pack a compact waterproof jacket or umbrella and keep Casa Batlló or another indoor stop as a flexible option.';if(min<12)return'Mornings and evenings may feel cool. Bring layers, a light jacket, and comfortable walking shoes; keep sunglasses handy for brighter spells.';if(max>=23)return'Mild to warm weather is possible. Wear breathable layers, comfortable walking shoes, and bring sunglasses; carry a light layer for the evening.';return'Pack comfortable walking shoes, a light jacket or cardigan, and sunglasses. Check the forecast again shortly before departure as conditions can change.'}
async function loadWeather(){refreshButton.disabled=true;refreshButton.textContent='Refreshing…';weatherStatus.textContent='Checking the latest forecast for Barcelona…';try{const url='https://api.open-meteo.com/v1/forecast?latitude=41.3874&longitude=2.1686&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=Europe%2FMadrid&start_date='+startDate+'&end_date='+endDate;const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('Forecast unavailable');const data=await response.json();if(!data.daily?.time?.length)throw new Error('No forecast dates available');const days=data.daily.time.map((date,i)=>({date,code:data.daily.weather_code[i],max:data.daily.temperature_2m_max[i],min:data.daily.temperature_2m_min[i],rain:data.daily.precipitation_probability_max?.[i],wind:data.daily.wind_speed_10m_max?.[i]}));weatherDays.innerHTML=days.map(day=>{const[desc,icon]=weatherDescription(day.code),rainText=Number.isFinite(day.rain)?'Rain chance '+day.rain+'%':'Rain chance n/a',windText=Number.isFinite(day.wind)?' · Wind '+Math.round(day.wind)+' km/h':'';return'<article class="weather-day"><div class="weather-date">'+dateLabel(day.date)+'</div><div class="weather-icon" aria-hidden="true">'+icon+'</div><div class="weather-desc">'+desc+'</div><div class="weather-temp">'+Math.round(day.max)+'° / '+Math.round(day.min)+'°C</div><div class="weather-rain">'+rainText+windText+'</div></article>'}).join('');weatherAdvice.textContent=adviceFor(days);weatherStatus.textContent='Forecast refreshed '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' · Europe/Madrid'}catch(error){weatherDays.innerHTML='<div class="weather-loading"><strong>Forecast not available yet.</strong><br>The provider may not have reliable data this far ahead. Please try again closer to October 28, or use the refresh button.</div>';weatherStatus.textContent='Live forecast temporarily unavailable';weatherAdvice.textContent='For late October in Barcelona, plan flexible layers and comfortable shoes; check a trusted forecast a few days before travel.'}finally{refreshButton.disabled=false;refreshButton.textContent='Refresh forecast ↻'}}
refreshButton.addEventListener('click',loadWeather);loadWeather();
\n// Live Security Update: display only the latest published backend result.
const securityIndicator=document.getElementById('security-indicator');
const securityCheckedAt=document.getElementById('security-checked-at');
const securityHeadline=document.getElementById('security-headline');
const securityAction=document.getElementById('security-action');
const securityAlerts=document.getElementById('security-alerts');
const securitySourceCount=document.getElementById('security-source-count');
const refreshSecurity=document.getElementById('refresh-security');
async function loadSecurityStatus(){
  refreshSecurity.disabled=true;
  refreshSecurity.textContent='Loading latest status…';
  try{
    const response=await fetch('security-status.json?ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('Status file unavailable');
    const data=await response.json();
    const checked=data.checked_at?new Date(data.checked_at):null;
    const stale=!checked || (Date.now()-checked.getTime()>4*60*60*1000);
    let state=data.status||'unavailable';
    if(stale)state='stale';
    securityIndicator.className='security-indicator '+state;
    securityIndicator.textContent=state==='clear'?'Routine status':state==='alert'?'Action recommended':state==='stale'?'Status is stale':'Check unavailable';
    securityHeadline.textContent=stale?'Unable to confirm current conditions — the published check is older than four hours.':(data.headline||'Unable to verify current conditions.');
    securityAction.textContent=stale?'Check official transport and police advisories directly before travelling; do not rely on this outdated status.':(data.action||'Check official advisories directly.');
    securityCheckedAt.textContent=checked?'Last check: '+checked.toLocaleString()+' (device local time)':'No successful check timestamp available.';
    securitySourceCount.textContent='Sources reachable: '+(data.sources_ok??0)+' of '+(data.sources_total??11)+'.';
    securityAlerts.replaceChildren();
    if(Array.isArray(data.alerts)&&data.alerts.length){
      const heading=document.createElement('h4');heading.textContent='Potentially relevant reports';securityAlerts.appendChild(heading);
      data.alerts.slice(0,5).forEach(item=>{
        const card=document.createElement('article');card.className='security-alert';
        const p=document.createElement('p');p.textContent=item.snippet||'Review the official source for details.';
        const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener';a.textContent='Open '+(item.source||'official source')+' ↗';
        card.append(p,a);securityAlerts.appendChild(card);
      });
    }
    if(data.disclaimer){const note=document.createElement('p');note.className='security-disclaimer';note.textContent=data.disclaimer;securityAlerts.appendChild(note);}
  }catch(error){
    securityIndicator.className='security-indicator unavailable';
    securityIndicator.textContent='Check unavailable';
    securityHeadline.textContent='Unable to verify current conditions.';
    securityAction.textContent='The latest status file could not be loaded. Check official transport and police advisories directly before travelling.';
    securityCheckedAt.textContent='Status could not be loaded.';
    securitySourceCount.textContent='No current source-check result is available.';
    securityAlerts.replaceChildren();
  }finally{
    refreshSecurity.disabled=false;
    refreshSecurity.textContent='Refresh latest published status ↻';
  }
}
refreshSecurity.addEventListener('click',loadSecurityStatus);
loadSecurityStatus();
