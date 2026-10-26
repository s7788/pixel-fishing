const fs=require('fs'),path=require('path');
const sharp=require('sharp');
const ROOT=path.resolve(__dirname,'..');
const m=JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.json'),'utf8'));
const labels={idle:'待機',cast:'拋投',retrieve:'收線',twitch:'抽竿',hookset:'揚竿作合',fight:'搏魚',land:'起魚',release:'放流',boat_drop:'船上放餌'};
const fxs={entry:'入水',chase:'追餌水紋',popper:'波扒水爆',bite:'咬餌',leap:'躍水水花',release:'放流水紋'};
const lures={minnow:'米諾',popper:'波扒',pencil:'鉛筆',soft_worm:'軟蟲＋鉛頭鉤',shore_jig:'岸拋鐵板',boat_jig:'船釣鐵板'};
function img(id,attrs=''){return `<img src="${m.sprites[id].file}" alt="${id}" ${attrs}>`}
let gallery=`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>pixel-fishing｜實作素材預覽</title><style>
*{box-sizing:border-box}body{margin:0;background:#081325;color:#f5e7c5;font:15px/1.6 system-ui,"Microsoft JhengHei",sans-serif}main{max-width:1180px;margin:auto;padding:28px}h1,h2{font-weight:600;line-height:1.3}h1{font-size:28px;margin:0}h2{font-size:21px;margin:36px 0 14px}p{color:#a9bfd0;margin:8px 0 18px}a{color:#9ddff0}button,select{font:inherit;background:#182b45;color:#f5e7c5;border:1px solid #526a83;padding:7px 12px;cursor:pointer}button[aria-pressed=true]{color:#081325;background:#f5d47a}button:focus-visible,select:focus-visible{outline:3px solid #ffcf50;outline-offset:3px}.controls{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.hero{max-width:768px;margin:auto}.scene{width:100%;aspect-ratio:16/9;display:block;border:2px solid #263b56}.status{display:flex;justify-content:space-between;gap:12px;background:#101e38;padding:9px 12px;flex-wrap:wrap;font-variant-numeric:tabular-nums}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:12px}.tile{background:#13233a;padding:14px;border:1px solid #2c425a}.fish{height:96px;display:flex;align-items:center;justify-content:center}.fish img{max-width:192px;max-height:96px;width:100%;object-fit:contain}.tile small{color:#a9bfd0}.film{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}.film img{width:96px;height:128px}.fx img{width:144px;height:96px}.lures img{width:128px;height:64px;object-fit:contain}img,canvas{image-rendering:pixelated;image-rendering:crisp-edges}code{color:#a9bfd0;font-size:12px;overflow-wrap:anywhere}.checker{background-color:#162944;background-image:linear-gradient(45deg,#1b3353 25%,transparent 25%),linear-gradient(-45deg,#1b3353 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1b3353 75%),linear-gradient(-45deg,transparent 75%,#1b3353 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}.caption{display:flex;justify-content:space-between;gap:12px;align-items:center}.small{font-size:13px}.ui-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.ui-row img{max-width:100%}.counts{margin:16px 0;color:#f5d47a}.footer{margin:40px 0 12px;border-top:1px solid #2c425a;padding-top:18px}@media(max-width:600px){main{padding:14px}.film{gap:4px}.film img{width:72px;height:96px}.grid{grid-template-columns:1fr}.status{font-size:13px}}
</style><main><div class="caption"><h1>pixel-fishing</h1><a href="../fishing-mod-assets-v1.zip">素材包 ZIP</a></div><p>實作素材預覽 · 8-bit 粗像素 · 原生畫布 384 × 216</p><div class="counts">3 種釣場 ／ 12 種魚 ／ 9 組釣手動作 ／ 6 類路亞 ／ 6 組特效</div>
<div class="hero"><div class="controls" id="venues">${Object.entries(m.scenes).map(([k,v])=>`<button type="button" data-scene="${k}" aria-pressed="${k==='lake'}">${v.name}</button>`).join('')}</div><canvas id="scene" class="scene" width="384" height="216" role="img" aria-label="所選場地的釣手、魚與釣具動畫預覽"></canvas><div class="status" aria-live="polite"><span id="scene-label">湖泊</span><span id="fish-label">大口黑鱸</span><span>範例：68.4 cm ／ 3.26 kg</span></div><div class="controls"><label>動作 <select id="action">${Object.entries(labels).map(([k,v])=>`<option value="${k}" ${k==='retrieve'?'selected':''}>${v}</option>`).join('')}</select></label><label>魚種 <select id="species">${Object.entries(m.animations.fish).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')}</select></label><label><input id="anchors" type="checkbox"> 顯示握點與竿尖</label><button id="pause" type="button" aria-pressed="false">暫停動畫</button></div></div>
<h2>魚種圖鑑</h2><div class="grid">${Object.entries(m.animations.fish).map(([k,v])=>`<article class="tile"><div class="fish checker">${img(v.portrait)}</div><div class="caption"><strong>${v.name}</strong>${img(v.icon,'width="48" height="32"')}</div><div class="fish">${img(v.swim.frames[0],`data-anim="fish:${k}" style="width:${m.sprites[v.swim.frames[0]].size[0]*2}px;height:${m.sprites[v.swim.frames[0]].size[1]*2}px"`)}</div><small>游動 4 格 · 轉向 2 格 · 躍水 2 格</small><br><code>${k}</code></article>`).join('')}</div>
<h2>釣手動作</h2>${Object.entries(m.animations.angler).map(([k,v])=>`<article class="tile" style="margin-bottom:12px"><div class="caption"><strong>${labels[k]}</strong><small>${v.frameMs} ms／格</small></div><div class="film checker">${v.frames.map(id=>img(id)).join('')}</div></article>`).join('')}
<h2>路亞與釣具</h2><div class="grid lures">${Object.entries(m.lures).map(([k,v])=>`<article class="tile"><strong>${lures[k]}</strong><div class="checker">${img(v.icon)}</div><small>圖鑑 32 × 16 ／ 場內 16 × 8</small></article>`).join('')}</div><div class="tile ui-row" style="margin-top:12px">${['straight','light_bend','heavy_bend','cast_back','drop'].map(x=>img('gear/rod/'+x,'width="96" height="96"')).join('')}${img('gear/landing-net','width="96" height="96"')}</div>
<h2>水花特效</h2><div class="grid fx">${Object.entries(m.animations.effects).map(([k,v])=>`<article class="tile"><strong>${fxs[k]}</strong><div class="checker">${img(v.frames[0],`data-anim="effect:${k}"`)}</div><small>4 格 · 100 ms／格</small></article>`).join('')}</div>
<h2>漁獲與紀錄介面</h2><div class="tile"><canvas id="catch" width="320" height="144" style="width:100%;max-width:640px" role="img" aria-label="漁獲卡範例，長度68.4公分、重量3.26公斤，長度和重量分開顯示"></canvas><p class="small">魚名、cm／kg 數值與破紀錄文字由程式繪製；本頁為示意資料，未建立任何真實漁獲紀錄。</p><div class="ui-row">${img('ui/icon/length-record','width="40" height="40"')}<span>最長紀錄</span>${img('ui/icon/weight-record','width="40" height="40"')}<span>最重紀錄</span>${img('font/measurements','width="192" height="96"')}</div></div>
<p class="footer">完整影格、尺寸、錨點、圖集座標與動畫時間：<a href="manifest.json">manifest.json</a> · <a href="README.zh-TW.md">使用說明</a> · <a href="validation.json">檢查結果</a> · 圖片生成提示詞：<a href="generation-plan.json">generation-plan.json</a></p></main>
<script>const M=${JSON.stringify(m)};const images={};let scene='lake',action='retrieve',species='largemouth_bass',paused=false,time=0,previous=0;const cvs=document.getElementById('scene'),ctx=cvs.getContext('2d');ctx.imageSmoothingEnabled=false;const cc=document.getElementById('catch').getContext('2d');cc.imageSmoothingEnabled=false;const ready=Promise.all(Object.entries(M.sprites).map(([id,s])=>new Promise((resolve,reject)=>{let im=new Image();im.onload=()=>{images[id]=im;resolve()};im.onerror=()=>reject(new Error('Missing image '+id));im.src=s.file})));const names=${JSON.stringify(labels)};const dot=(x,y,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x)-1,Math.round(y)-1,3,3)};function draw(){ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,384,216);const s=M.scenes[scene],a=M.animations.angler[action],f=Math.floor(time/a.frameMs)%a.frames.length,aid=a.frames[f],am=M.sprites[aid],grip=am.anchors.grip,ax=s.feet[0]-24,ay=s.feet[1]-62;for(const id of s.layers.slice(0,3))ctx.drawImage(images[id],0,0,384,216);ctx.drawImage(images[aid],ax,ay);let rodName=action==='fight'?'heavy_bend':action==='hookset'||action==='twitch'?'light_bend':action==='boat_drop'?'drop':action==='cast'&&f<2?'cast_back':'straight';const rid='gear/rod/'+rodName,r=M.sprites[rid],rx=Math.round(ax+grip[0]-r.anchors.grip[0]),ry=Math.round(ay+grip[1]-r.anchors.grip[1]),tip=[rx+r.anchors.tip[0],ry+r.anchors.tip[1]];if(!['land','release'].includes(action))ctx.drawImage(images[rid],rx,ry);if(action==='land'){const n=M.sprites['gear/landing-net'];ctx.drawImage(images['gear/landing-net'],ax+grip[0]-n.anchors.grip[0],ay+grip[1]-n.anchors.grip[1])}const fa=M.animations.fish[species].swim,fid=fa.frames[Math.floor(time/fa.frameMs)%4],fm=M.sprites[fid],fx=scene==='boat'?278:275,fy=scene==='boat'?168:154;ctx.save();ctx.translate(fx+fm.size[0]/2,fy);ctx.scale(-1,1);ctx.drawImage(images[fid],-fm.size[0]/2,-fm.size[1]/2);ctx.restore();const mouth=[fx+fm.size[0]-fm.anchors.mouth[0],fy-fm.size[1]/2+fm.anchors.mouth[1]],lid=M.lures[scene==='boat'?'boat_jig':'minnow'].world,ls=M.sprites[lid],lpos=scene==='boat'?[tip[0]+8,163]:[mouth[0]-24,mouth[1]-5];if(!['land','release'].includes(action)){ctx.strokeStyle='#fff2c9';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(...tip);ctx.lineTo(lpos[0]+ls.anchors.tie[0],lpos[1]+ls.anchors.tie[1]);ctx.stroke();ctx.drawImage(images[lid],...lpos)}const ef=M.animations.effects[scene==='boat'?'chase':'leap'],ei=ef.frames[Math.floor(time/ef.frameMs)%4];ctx.drawImage(images[ei],fx-14,(scene==='boat'?s.waterline:fy+6));ctx.drawImage(images[s.layers[3]],0,0,384,216);ctx.fillStyle='#101e38';ctx.fillRect(5,5,104,18);ctx.fillStyle='#ffe0a2';ctx.font='11px Microsoft JhengHei, sans-serif';ctx.fillText(s.name+' · '+names[action],11,18);if(document.getElementById('anchors').checked){dot(ax+grip[0],ay+grip[1],'#ffcb4d');dot(...tip,'#ff2637');dot(...mouth,'#38c998')}document.getElementById('scene-label').textContent=s.name;document.getElementById('fish-label').textContent=M.animations.fish[species].name;for(const im of document.querySelectorAll('[data-anim]')){const[k,id]=im.dataset.anim.split(':');const anim=k==='fish'?M.animations.fish[id].swim:M.animations.effects[id];const sprite=anim.frames[Math.floor(time/anim.frameMs)%anim.frames.length];if(im.dataset.frame!==sprite){im.src=M.sprites[sprite].file;im.dataset.frame=sprite}}drawCatch()}
function drawCatch(){cc.clearRect(0,0,320,144);cc.drawImage(images['ui/catch-panel'],20,16);cc.drawImage(images[M.animations.fish[species].portrait],36,42);cc.fillStyle='#ffe0a2';cc.font='12px Microsoft JhengHei, sans-serif';cc.fillText('釣獲！ '+M.animations.fish[species].name,35,36);cc.drawImage(images['ui/icon/length-record'],142,49);cc.drawImage(images['ui/icon/weight-record'],142,80);cc.fillText('68.4 cm',170,64);cc.fillText('3.26 kg',170,95);cc.font='10px Microsoft JhengHei, sans-serif';cc.fillText('範例數據 · 最長與最重分開記錄',35,114)}
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{scene=b.dataset.scene;document.querySelectorAll('[data-scene]').forEach(x=>x.setAttribute('aria-pressed',x===b));species=scene==='lake'?'largemouth_bass':scene==='coast'?'spotted_seabass':'greater_amberjack';document.getElementById('species').value=species;draw()});document.getElementById('action').onchange=e=>{action=e.target.value;time=0;draw()};document.getElementById('species').onchange=e=>{species=e.target.value;draw()};document.getElementById('anchors').onchange=draw;document.getElementById('pause').onclick=e=>{paused=!paused;e.target.setAttribute('aria-pressed',paused);e.target.textContent=paused?'播放動畫':'暫停動畫'};ready.then(()=>{window.assetPreviewReady=true;function loop(t){if(!paused)time+=previous?Math.min(t-previous,100):0;previous=t;draw();requestAnimationFrame(loop)}requestAnimationFrame(loop)}).catch(e=>{document.getElementById('scene-label').textContent=e.message;window.assetPreviewError=e.message;console.error(e)});</script></html>`;
gallery=gallery.replace("let rodName=", "const rodScale=scene==='boat'?.8:1;let rodName=")
 .replace("const rid='gear/rod/'+rodName", "const rid=am.equipment&&am.equipment.startsWith('gear/rod/')?am.equipment:'gear/rod/'+rodName")
 .replace('r.anchors.grip[0]),ry=', 'r.anchors.grip[0]*rodScale),ry=')
 .replace('r.anchors.grip[1]),tip=', 'r.anchors.grip[1]*rodScale),tip=')
 .replace('tip=[rx+r.anchors.tip[0],ry+r.anchors.tip[1]]', 'tip=[Math.round(rx+r.anchors.tip[0]*rodScale),Math.round(ry+r.anchors.tip[1]*rodScale)]')
 .replace('ctx.drawImage(images[rid],rx,ry)', 'ctx.drawImage(images[rid],rx,ry,Math.round(96*rodScale),Math.round(96*rodScale))')
 .replace("lpos=scene==='boat'?[tip[0]+8,163]:[mouth[0]-24,mouth[1]-5]", "lpos=['fight','hookset'].includes(action)?[mouth[0]-ls.anchors.tie[0],mouth[1]-ls.anchors.tie[1]]:scene==='boat'?[tip[0]+8,163]:[mouth[0]-24,mouth[1]-5]")
 .replace("if(action==='land'){", "if(action==='land'&&am.equipment){")
 .replace('scene=b.dataset.scene;', "scene=b.dataset.scene;action=scene==='boat'?'boat_drop':'retrieve';document.getElementById('action').value=action;");
fs.writeFileSync(path.join(ROOT,'preview.html'),gallery);

const overviewEnglish = {
  scenes: { lake: 'Lake', coast: 'Coast', boat: 'Boat' },
  actions: { idle: 'Idle', cast: 'Cast', retrieve: 'Retrieve', twitch: 'Twitch', hookset: 'Hookset', fight: 'Fight', land: 'Land', release: 'Release', boat_drop: 'Boat Drop' },
  fish: {
    largemouth_bass: 'Largemouth Bass', topmouth_culter: 'Topmouth Culter',
    striped_snakehead: 'Striped Snakehead', peacock_bass: 'Peacock Bass',
    spotted_seabass: 'Spotted Seabass', great_barracuda: 'Great Barracuda',
    indo_pacific_tarpon: 'Indo-Pacific Tarpon', malabar_grouper: 'Malabar Grouper',
    narrow_barred_mackerel: 'Spanish Mackerel', mahi_mahi: 'Mahi-mahi',
    greater_amberjack: 'Greater Amberjack', yellowfin_tuna: 'Yellowfin Tuna',
  },
  lures: { minnow: 'Minnow', popper: 'Popper', pencil: 'Pencil', soft_worm: 'Soft Worm', shore_jig: 'Shore Jig', boat_jig: 'Boat Jig' },
};

async function overview(locale = 'zh-TW') {
  const english = locale === 'en';
  const layers = [];
  const W = 1200, H = 1280;
  const bg = sharp({ create: { width: W, height: H, channels: 4, background: '#081325' } });
  function label(x, y, text, size = 20) {
    if (typeof text !== 'string') throw new Error(`Missing ${locale} overview label at ${x},${y}`);
    layers.push({
      input: Buffer.from(`<svg width="${W-x}" height="48"><text x="0" y="${size+3}" font-family="Microsoft JhengHei, Arial, sans-serif" font-size="${size}" fill="#f5e7c5">${text.replaceAll('&', '&amp;')}</text></svg>`),
      left: x, top: y,
    });
  }
  async function sprite(id, width, height, left, top) {
    const input = await sharp(path.join(ROOT, m.sprites[id].file))
      .resize(width, height, { kernel: 'nearest' }).png().toBuffer();
    layers.push({ input, left, top });
  }
  label(24, 14, english ? 'pixel-fishing · ASSET PACK v1' : 'pixel-fishing · 素材包 v1', 28);
  label(24, 55, english
    ? '3 spots · 12 species · 36 angler frames · 96 fish frames · 6 lures · 24 effect frames'
    : '3 場地 · 12 魚種 · 36 釣手影格 · 96 魚影格 · 6 路亞 · 24 特效', 16);
  let col = 0;
  for (const [id, scene] of Object.entries(m.scenes)) {
    await sprite('scene/' + id + '/preview', 384, 216, 12 + col * 396, 101);
    label(18 + col * 396, 321, english ? overviewEnglish.scenes[id] : scene.name, 18);
    col++;
  }
  label(24, 370, english ? 'Angler actions | Four frames each' : '釣手動作｜每組四個影格', 20);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const key = Object.keys(m.animations.angler)[r * 3 + c];
    label(24 + c * 396, 410 + r * 110, english ? overviewEnglish.actions[key] : labels[key], 15);
    for (let i = 0; i < 4; i++) {
      await sprite(m.animations.angler[key].frames[i], 48, 64, 40 + c * 396 + i * 72, 438 + r * 110);
    }
  }
  label(24, 754, english ? 'Fish collection | 12 distinct silhouettes' : '魚種圖鑑｜12 種獨立輪廓', 20);
  let i = 0;
  for (const [id, fish] of Object.entries(m.animations.fish)) {
    const x = 24 + (i % 6) * 196, y = 800 + Math.floor(i / 6) * 118;
    await sprite(fish.portrait, 144, 72, x + 12, y);
    label(x, y + 76, english ? overviewEnglish.fish[id] : fish.name, 13);
    i++;
  }
  label(24, 1050, english ? 'Lures and effects' : '路亞與特效', 20);
  i = 0;
  for (const [id, lure] of Object.entries(m.lures)) {
    await sprite(lure.icon, 96, 48, 36 + i * 196, 1100);
    label(24 + i * 196, 1150, english ? overviewEnglish.lures[id] : lures[id], 14);
    i++;
  }
  i = 0;
  for (const effect of Object.values(m.animations.effects)) {
    await sprite(effect.frames[1], 96, 64, 36 + i * 196, 1187);
    i++;
  }
  await bg.composite(layers).png().toFile(path.join(ROOT, english ? 'overview.en.png' : 'overview.png'));
}

overview().then(() => overview('en')).catch(e => { console.error(e); process.exit(1); });
