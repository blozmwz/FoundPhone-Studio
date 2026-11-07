// Production deployment copies the reviewed artifact instead of rebuilding it.
// Hash checks fail closed if any file is changed or added. No secrets required.
import{readFile,readdir,stat,cp,rm}from'node:fs/promises';import{createHash}from'node:crypto';import path from'node:path';
const manifest=JSON.parse(await readFile('release/frozen-manifest.json','utf8')),source='release/runtime';
async function list(dir,rel=''){let all=[];for(const name of(await readdir(path.join(dir,rel))).sort()){const file=path.join(rel,name);if((await stat(path.join(dir,file))).isDirectory())all.push(...await list(dir,file));else all.push(file);}return all;}
const expected=manifest.files.map(f=>f.path).sort();if(JSON.stringify(await list(source))!==JSON.stringify(expected))throw Error('Release file list differs');
for(const f of manifest.files){const bytes=await readFile(path.join(source,f.path));if(bytes.length!==f.bytes||createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Release hash mismatch: '+f.path);}
if(createHash('sha256').update(JSON.stringify(manifest.files)).digest('hex')!==manifest.bundleSha256)throw Error('Release manifest hash mismatch');
await rm('dist',{recursive:true,force:true});await cp(source,'dist',{recursive:true});console.log('Exact reviewed release copied: '+manifest.build+' / '+manifest.bundleSha256);
