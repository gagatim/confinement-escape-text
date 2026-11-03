// 更新 index.html 裡 css/ 與 js/ 檔案的版本號（?v=...），讓瀏覽器與「新版本偵測」知道有新版本。
// 用法：node tools/bump-version.js            → 用目前時間（YYYYMMDDHHMM）
//       node tools/bump-version.js 20261103c  → 指定版本號
// 只會改 <script src="js/..."> 與 <link href="css/..."> 的版本號，不會動頁面上其他的 ?v=（例如 YouTube 連結）。
const fs=require('fs');
const file='index.html';
const pad=n=>String(n).padStart(2,'0');
const d=new Date();
const v=process.argv[2]||`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
if(!/^[0-9A-Za-z_-]+$/.test(v)){console.error('版本號只能包含英數字、底線、連字號');process.exit(1);}
const src=fs.readFileSync(file,'utf8');
let n=0;
const out=src.replace(/(<script src="js\/[^"?]+|<link rel="stylesheet" href="css\/[^"?]+)\?v=[^"]*"/g,(m,p)=>{n++;return `${p}?v=${v}"`;});
if(!n){console.error('找不到任何 js/ 或 css/ 的版本號，沒有修改');process.exit(1);}
if(out!==src)fs.writeFileSync(file,out);
console.log(`已把 ${n} 處版本號設為 ${v}${out===src?'（內容沒變）':''}`);
