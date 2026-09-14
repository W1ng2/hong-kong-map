import {describe,it,expect} from 'vitest'
import fs from 'node:fs'
import {openingStatus,filterPlaces,mapsUrl,distance} from '../src/model.js'
import {validateData} from '../scripts/validate-data.mjs'
const data=JSON.parse(fs.readFileSync('public/places.json','utf8'))
const at=(id,iso)=>openingStatus(data.find(p=>p.id===id),new Date(iso))
describe('Hong Kong opening hours',()=>{
 it('uses HK time even on a UTC host',()=>expect(at('kam-roast','2026-09-14T04:00:00Z').state).toBe('open'))
 it('before opening is closed but not a rest day',()=>expect(at('kam-roast','2026-09-14T02:00:00Z').state).toBe('before-open'))
 it('has split service and midday break',()=>expect(at('samsen','2026-09-14T08:00:00Z').state).toBe('between'))
 it('supports previous day overnight service',()=>expect(at('kai-kai','2026-09-14T16:30:00Z').state).toBe('open'))
 it('closes exactly at end of overnight service',()=>expect(at('kai-kai','2026-09-14T17:00:00Z').state).toBe('before-open'))
 it('knows a regular museum rest day',()=>expect(at('art-museum','2026-09-17T04:00:00Z').state).toBe('rest-day'))
 it('opens a Thursday holiday museum',()=>expect(at('art-museum','2026-10-01T12:00:00Z').state).toBe('open'))
 it('closes museum on lunar new year',()=>expect(at('art-museum','2026-02-17T04:00:00Z').state).toBe('rest-day'))
 it('closes early on Christmas eve',()=>expect(at('art-museum','2026-12-24T10:00:00Z').state).toBe('closed'))
 it('does not pretend an unresearched holiday year is verified',()=>expect(at('art-museum','2027-10-01T04:00:00Z').state).toBe('unknown'))
 it('does not gray an unknown-hours restaurant',()=>expect(at('po-kee','2026-09-14T04:00:00Z')).toMatchObject({state:'unknown',closed:false}))
 it('does not infer holiday opening from ordinary hours',()=>expect(at('sing-heung-yuen','2026-10-01T04:00:00Z').state).toBe('unknown'))
 it('does not leak a previous holiday overnight exception',()=>{
  const p={schedule:{days:{mon:[['12:00','02:00']],tue:[]},exceptions:{'2026-09-14':[]}}}
  expect(openingStatus(p,new Date('2026-09-14T17:00:00Z')).state).toBe('rest-day')
 })
})
describe('filters and provenance',()=>{
 it('validates every published record',()=>expect(validateData(data)).toEqual([]))
 it('filters cuisine rather than Michelin/rating',()=>expect(filterPlaces(data,{category:'燒味'}).map(p=>p.id)).toEqual(['kam-roast','po-kee']))
 it('filters regions',()=>expect(filterPlaces(data,{region:'新界及離島'}).map(p=>p.id)).toEqual(['heritage-museum']))
 it('searches name and signature',()=>expect(filterPlaces(data,{query:'船麵'}).map(p=>p.id)).toEqual(['samsen']))
 it('does not treat unknown as open',()=>expect(filterPlaces(data,{open:true},[],null,new Date('2026-09-14T04:00:00Z')).some(p=>p.id==='po-kee')).toBe(false))
 it('has no nearby results without a location',()=>expect(filterPlaces(data,{nearby:true})).toEqual([]))
 it('filters saved ids',()=>expect(filterPlaces(data,{saved:true},['samsen']).map(p=>p.id)).toEqual(['samsen']))
 it('budget uses upper planning range',()=>expect(filterPlaces(data,{budget:100}).every(p=>p.budget?.[1]<=100)).toBe(true))
 it('navigation encodes branch address',()=>expect(decodeURIComponent(mapsUrl(data.find(p=>p.id==='kai-kai')))).toContain('113–115'))
 it('does not contain Vietnam or souvenir data',()=>expect(JSON.stringify(data)).not.toMatch(/Da Nang|峴港|Hoi An|souvenir/i))
 it('rejects benefit-for-review restaurants even if highly rated',()=>expect(validateData([{...data[0],rating:5,audit:{...data[0].audit,incentiveEvidence:true}}])).toContain('kam-roast: unreviewed or incentivized evidence'))
 it('rejects PR-only support and pending audits',()=>{for(const audit of [{status:'pending',incentiveEvidence:false,prOnly:false},{status:'public-sample-reviewed',incentiveEvidence:false,prOnly:true}])expect(validateData([{...data[0],audit}])).toContain('kam-roast: unreviewed or incentivized evidence')})
 it('rejects non-exception low ratings',()=>expect(validateData([{...data[0],admission:'standard'}])).toContain('kam-roast: fails admission threshold'))
 it('has honest location distance',()=>expect(distance(data[0],data[0])).toBe(0))
})

