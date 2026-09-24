import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {handleCreatorRequest} from './github-creator.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT)||4348;
const mime={
 '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8','.svg':'image/svg+xml',
 '.gif':'image/gif','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.woff':'font/woff','.woff2':'font/woff2','.otf':'font/otf','.ttf':'font/ttf',
 '.mp4':'video/mp4','.md':'text/plain; charset=utf-8'
};
const headers=file=>({'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
// Clean routes, as vercel.json cleanUrls serves them. The .html forms redirect to the clean one.
const pages={'/skills':'/skills.html','/memory':'/memory.html','/new':'/new.html','/arena':'/arena.html','/long-horizon':'/long-horizon.html'};
async function sendFile(req,res,base,requestPath){
 const target=path.resolve(base,`.${requestPath}`);
 const relative=path.relative(base,target);
 if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end('Forbidden');return;}
 if(!(await stat(target)).isFile()){res.writeHead(404);res.end('Not found');return;}
 const content=await readFile(target);
 res.writeHead(200,headers(target));
 res.end(req.method==='HEAD'?undefined:content);
}
const server=http.createServer(async(req,res)=>{
 try{
  if(await handleCreatorRequest(req,res))return;
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  const url=new URL(req.url,'http://localhost');
  let requestPath=decodeURIComponent(url.pathname);
  // Dot paths (.env, .local) stay private. Backslash counts as a separator: path.resolve treats it as one on Windows.
  if(requestPath.split(/[\\/]/).some(segment=>segment.startsWith('.'))){res.writeHead(404);res.end('Not found');return;}
  for(const [clean,file] of Object.entries(pages)){
   if(requestPath===file||requestPath===clean+'/'){res.writeHead(308,{Location:clean+url.search});res.end();return;}
   if(requestPath===clean)requestPath=file;
  }
  await sendFile(req,res,root,requestPath==='/'?'/index.html':requestPath);
 }catch(error){res.writeHead(error instanceof URIError?400:404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Harness Firmware preview: http://127.0.0.1:${port}`));
