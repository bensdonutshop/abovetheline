// Verifies every URL in data/curated.json resolves. Run: node check-links.js
const fs = require('fs'); const https = require('https'); const http = require('http');
const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

function head(url, depth){
  depth = depth || 0;
  return new Promise(function(res){
    if(depth>5) return res({url:url,status:'redirect-loop'});
    var u; try{ u=new URL(url); }catch(e){ return res({url:url,status:'bad-url'}); }
    var lib = u.protocol==='https:'?https:http;
    var req = lib.request(u,{method:'GET',headers:{'User-Agent':UA,'Accept':'text/html,*/*'},timeout:15000},function(r){
      var code=r.statusCode;
      if([301,302,303,307,308].indexOf(code)>=0 && r.headers.location){
        r.destroy();
        head(new URL(r.headers.location,u).href, depth+1).then(res);
        return;
      }
      r.destroy(); res({url:url,status:code});
    });
    req.on('timeout',function(){req.destroy();res({url:url,status:'timeout'});});
    req.on('error',function(e){res({url:url,status:'ERR '+e.code});});
    req.end();
  });
}
(async function(){
  var d=JSON.parse(fs.readFileSync('data/curated.json','utf8'));
  var items=[];
  d.topics.forEach(t=>items.push(['topic',t.headline,t.url]));
  d.campaigns12m.forEach(t=>items.push(['12mo',t.campaign,t.url]));
  d.cannes2026.forEach(t=>items.push(['cannes',t.campaign,t.url]));
  d.nordicSeed.forEach(t=>items.push(['nordic',t.campaign,t.url]));
  var out=[];
  for(var i=0;i<items.length;i+=6){
    var chunk=items.slice(i,i+6);
    var rs=await Promise.all(chunk.map(c=>head(c[2])));
    for(var j=0;j<chunk.length;j++) out.push([chunk[j][0],chunk[j][1],rs[j].status,chunk[j][2]]);
  }
  var bad=0;
  out.forEach(function(r){ var ok=(r[2]===200||r[2]===999||r[2]===403); if(r[2]!==200)bad++;
    console.log((r[2]===200?'ok  ':'CHK ')+String(r[2]).padEnd(12)+' ['+r[0]+'] '+r[1].slice(0,42).padEnd(44)+' '+r[3].slice(0,78)); });
  console.log('\n'+out.length+' links checked, '+bad+' non-200');
})();
