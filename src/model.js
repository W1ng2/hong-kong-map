export const REGIONS = ['全香港','港島','九龍','新界及離島']
export const DAYS = ['sun','mon','tue','wed','thu','fri','sat']
export const CATEGORIES = ['全部','點心','燒味','粉麵','茶餐廳','煲仔飯','中菜／小菜','各國料理','Cafe／烘焙','糖水／甜品']
const minutes = t => Number(t.split(':')[0])*60+Number(t.split(':')[1])
export function openingStatus(place, now = new Date()) {
  const s = place.schedule
  if (!s) return {state:'unknown',label:'時間待核實',closed:false}
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Hong_Kong',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now)
  const get = k => parts.find(p=>p.type===k)?.value
  const day = DAYS.indexOf(get('weekday').toLowerCase().slice(0,3)), minute=Number(get('hour'))*60+Number(get('minute'))
  const localDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
  if(s.calendarYear && Number(localDate.slice(0,4))!==s.calendarYear)return {state:'unknown',label:'假期時間待更新',closed:false}
  const previousDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now.getTime()-86400000))
  const previous = s.exceptions && Object.hasOwn(s.exceptions,previousDate)?s.exceptions[previousDate]:s.days?.[DAYS[(day+6)%7]]
  if(s.exceptions && Object.hasOwn(s.exceptions,localDate))return statusFor(s.exceptions[localDate], previous, minute)
  if(s.alwaysOpen)return {state:'open',label:'全天開放',closed:false}
  return statusFor(s.days?.[DAYS[day]],previous,minute)
}
function statusFor(today, previous=[], minute) {
  if(!today)return {state:'unknown',label:'時間待核實',closed:false}
  if(previous?.some(([a,b])=>minutes(b)<minutes(a)&&minute<minutes(b)))return {state:'open',label:'營業中',closed:false}
  if(!today.length)return {state:'rest-day',label:'休息日',closed:true}
  if(today.some(([a,b])=>minutes(b)<minutes(a)?minute>=minutes(a):minute>=minutes(a)&&minute<minutes(b)))return {state:'open',label:'營業中',closed:false}
  const next=[...today].sort((a,b)=>minutes(a[0])-minutes(b[0])).find(([a])=>minute<minutes(a))
  return next?{state:minute<minutes(today[0][0])?'before-open':'between',label:minute<minutes(today[0][0])?'未開門':'午休中',closed:true,next:next[0]}:{state:'closed',label:'已打烊',closed:true}
}
export function distance(a,b) {
  const rad=x=>x*Math.PI/180,dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng)
  return 6371*2*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2))
}
export function filterPlaces(places,{mode='all',region='全香港',category='全部',query='',open=false,budget=0,nearby=false,saved=false},favorites=[],location=null,now=new Date()) {
  const q=query.trim().toLocaleLowerCase('zh-HK')
  return places.filter(p=>(mode==='all'||p.kind===mode)&&(region==='全香港'||p.region===region)&&(category==='全部'||p.category===category)&&(!q||[p.name,p.en,p.district,p.address,p.signature,p.category].join(' ').toLocaleLowerCase('zh-HK').includes(q))&&(!open||openingStatus(p,now).state==='open')&&(!budget||(p.budget&&p.budget[1]<=budget))&&(!nearby||(location&&distance(location,p)<=3))&&(!saved||favorites.includes(p.id))).sort((a,b)=>location?distance(location,a)-distance(location,b):0)
}
export function mapsUrl(p,provider='google') {
  const query=encodeURIComponent(p.name+' '+p.address)
  return provider==='apple'?'https://maps.apple.com/?q='+query+'&ll='+p.lat+','+p.lng:'https://www.google.com/maps/search/?api=1&query='+query
}
export const budgetLabel=p=>p.budget?'HK$'+p.budget[0]+(p.budget[1]!==p.budget[0]?'–'+p.budget[1]:''):p.kind==='attraction'?'票價見官方':'預算待核實'
export const safeRead=(key,fallback=[])=>{try{const value=JSON.parse(localStorage.getItem('hk-street:v1:'+key));return Array.isArray(value)&&value.every(x=>typeof x==='string')?[...new Set(value)]:fallback}catch{return fallback}}
export function safeWrite(key,value){try{localStorage.setItem('hk-street:v1:'+key,JSON.stringify(value));return true}catch{return false}}
