import fs from 'node:fs'
import {CATEGORIES,REGIONS} from '../src/model.js'
export function validateData(data){
 const errors=[],ids=new Set()
 for(const p of data){
  const bad=msg=>errors.push(p.id+': '+msg)
  if(ids.has(p.id))bad('duplicate id')
  ids.add(p.id)
  if(!['restaurant','attraction'].includes(p.kind))bad('invalid kind')
  if(!REGIONS.includes(p.region)||p.region==='全香港')bad('invalid region')
  if(!(p.lat>=22.1&&p.lat<=22.6&&p.lng>=113.8&&p.lng<=114.5))bad('outside HK')
  for(const key of ['name','address','description','signature','arrival','hours','booking','selectionReason','reviewAudit','geoNote','checkedAt'])if(!p[key])bad('missing '+key)
  if(p.sources?.length<2)bad('missing source corroboration')
  for(const s of p.sources||[])if(!s.label||!/^https?:\/\//.test(s.url))bad('invalid source')
  if(p.kind==='restaurant'){
   if(!CATEGORIES.includes(p.category))bad('invalid cuisine')
   if(p.audit?.status!=='public-sample-reviewed'||p.audit.incentiveEvidence!==false||p.audit.prOnly!==false)bad('unreviewed or incentivized evidence')
   const rule=p.admission==='independent-exception'?[4,0]:p.admission==='cafe'?[4.3,150]:p.admission==='standard'?[4.2,300]:[6,Infinity]
   if(!(p.rating>=rule[0]&&p.reviewCount>=rule[1]))bad('fails admission threshold')
   if(p.admission==='independent-exception'&&!p.sources.some(s=>/michelin|discoverhongkong|maps.apple/.test(s.url)))bad('missing independent exception basis')
  }else if(!p.photo)bad('attraction needs real photo marker')
  if(p.photo){for(const k of ['url','sourceUrl','credit','license','licenseUrl','alt','kind'])if(!p.photo[k])bad('photo missing '+k)}
  const intervals=p.schedule?[...Object.values(p.schedule.days||{}),...Object.values(p.schedule.exceptions||{})]:[]
  if(p.schedule&&!['sun','mon','tue','wed','thu','fri','sat'].every(d=>Object.hasOwn(p.schedule.days||{},d)))bad('incomplete weekly schedule')
  for(const list of intervals){if(list===null)continue;if(!Array.isArray(list)){bad('invalid intervals');continue}for(const pair of list)if(pair.length!==2||!pair.every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||pair[0]===pair[1])bad('invalid time')}
 }
 return errors
}
if(process.argv[1]?.endsWith('validate-data.mjs')){
 const data=JSON.parse(fs.readFileSync('public/places.json','utf8')),errors=validateData(data)
 for(const p of data)if(p.photo&&!fs.existsSync('public/'+p.photo.url))errors.push(p.id+': missing image file')
 if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log(JSON.stringify({places:data.length,restaurants:data.filter(p=>p.kind==='restaurant').length,attractions:data.filter(p=>p.kind==='attraction').length,schedules:data.filter(p=>p.schedule).length,photos:data.filter(p=>p.photo).length}))
}

