import sharp from 'sharp'
import {mkdir,copyFile,writeFile} from 'node:fs/promises'
await mkdir('public/icons',{recursive:true})
await mkdir('public/assets',{recursive:true})
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#bc3b30"/><rect x="96" y="96" width="320" height="320" rx="20" fill="none" stroke="#f4eedf" stroke-width="10"/><path d="M154 190h204M154 238h204M203 148v144M309 148v144M165 328h182v38H165z" stroke="#f4eedf" fill="none" stroke-width="18" stroke-linejoin="round"/><circle cx="194" cy="377" r="13" fill="#f4eedf"/><circle cx="320" cy="377" r="13" fill="#f4eedf"/></svg>'
for(const size of [192,512])await sharp(Buffer.from(svg)).resize(size).png().toFile('public/icons/icon-'+size+'.png')
await sharp(Buffer.from(svg)).png().toFile('public/icons/icon-maskable.png')
await copyFile('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs','public/assets/map-worker.mjs')
await copyFile('node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs','public/assets/maplibre-gl-shared.mjs')
await writeFile('public/release.json',JSON.stringify({id:process.env.GITHUB_SHA||'local',builtAt:new Date().toISOString()}))
