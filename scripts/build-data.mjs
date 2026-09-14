import {curatedPlaces} from '../data/places.mjs'
import fs from 'node:fs/promises'
const photos=JSON.parse(await fs.readFile('data/photo-licenses.json','utf8'))
const data=curatedPlaces.map(p=>({...p,photo:photos[p.id]?{...photos[p.id],alt:p.name+(p.kind==='attraction'?'建築或園區實景':'門面實景'),kind:p.kind==='attraction'?'landmark':'storefront'}:null}))
await fs.writeFile('public/places.json',JSON.stringify(data,null,2)+'\n')
console.log('Generated',data.length,'Hong Kong places')
