import fs from 'fs';
import path from 'path';
const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/,'$1'));
function walk(d){
  try{
    for(const e of fs.readdirSync(d,{withFileTypes:true})){
      const p = path.join(d,e.name);
      if(e.isDirectory()) walk(p);
      else if(e.isFile() && /tailwindcss-oxide.*\.node$/i.test(e.name)){
        console.log('found',p);
        try{ fs.chmodSync(p,0o666); }catch(_){}
        try{ fs.unlinkSync(p); console.log('removed',p);}catch(err){ console.warn('cannot remove',p,err.message); }
      }
    }
  }catch(e){}
}
const nm = path.join(process.cwd(),'node_modules');
if(fs.existsSync(nm)) walk(nm); else console.log('no node_modules');
