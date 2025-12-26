function showTab(which){
  const org = document.getElementById("panelOrg");
  const csv = document.getElementById("panelCsv");
  const ind = document.getElementById("tabIndicator");
  if(which === "org"){
    org.classList.remove("hidden");
    csv.classList.add("hidden");
    ind.style.transform = "translateX(0%)";
  } else {
    csv.classList.remove("hidden");
    org.classList.add("hidden");
    ind.style.transform = "translateX(100%)";
  }
}
window.showTab = showTab;

// ---------- File Organizer ----------
const filesInput = document.getElementById("files");
const groupsEl = document.getElementById("groups");
const fileSummary = document.getElementById("fileSummary");
const zipBtn = document.getElementById("zipBtn");

let currentFiles = [];
let currentGroups = [];

function fmtBytes(n){
  const u=["B","KB","MB","GB"];
  let i=0, x=n;
  while(x>=1024 && i<u.length-1){ x/=1024; i++; }
  return `${x.toFixed(i===0?0:1)} ${u[i]}`;
}

filesInput?.addEventListener("change", (e) => {
  currentFiles = Array.from(e.target.files || []);
  groupsEl.innerHTML = "";

  if(!currentFiles.length){
    fileSummary.textContent = "No files selected";
    zipBtn.disabled = true;
    return;
  }

  const map = new Map();
  for(const f of currentFiles){
    const parts = f.name.split(".");
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : "no_extension";
    if(!map.has(ext)) map.set(ext, []);
    map.get(ext).push(f);
  }
  currentGroups = Array.from(map.entries()).sort((a,b)=> b[1].length - a[1].length);

  const totalBytes = currentFiles.reduce((s,f)=>s+f.size,0);
  fileSummary.textContent = `${currentFiles.length} files • ${fmtBytes(totalBytes)} • ${currentGroups.length} groups`;
  zipBtn.disabled = false;

  for(const [ext, arr] of currentGroups){
    const size = arr.reduce((s,f)=>s+f.size,0);
    const box = document.createElement("div");
    box.className = "box";
    box.innerHTML = `<div class="k">${ext}</div><div class="s">${arr.length} files • ${fmtBytes(size)}</div>`;
    groupsEl.appendChild(box);
  }
});

async function downloadZip(){
  if(!currentFiles.length) return;
  const zip = new JSZip();
  for(const [ext, arr] of currentGroups){
    const folder = zip.folder(ext) || zip;
    for(const f of arr){
      folder.file(f.name, f);
    }
  }
  const blob = await zip.generateAsync({type:"blob"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "organized_files.zip";
  a.click();
  URL.revokeObjectURL(a.href);
}
window.downloadZip = downloadZip;

// ---------- CSV toggles ----------
const state = {
  trim_headers: true,
  normalize_headers: true,
  trim_cells: true,
  drop_empty_rows: true,
  drop_empty_cols: false,
  dedupe_rows: false,
};

function setSwitch(id, on){
  const el = document.getElementById("sw_" + id);
  if(!el) return;
  if(on) el.classList.add("on");
  else el.classList.remove("on");
}
function flip(key){
  state[key] = !state[key];
  setSwitch(key, state[key]);
}
window.flip = flip;
Object.keys(state).forEach(k => setSwitch(k, state[k]));

// CSV input
const csvInput = document.getElementById("csvFile");
const csvName = document.getElementById("csvName");
const cleanBtn = document.getElementById("cleanBtn");
const csvStatus = document.getElementById("csvStatus");

csvInput?.addEventListener("change", (e)=>{
  const f = e.target.files?.[0] || null;
  csvName.textContent = f ? f.name : "No CSV selected";
  cleanBtn.disabled = !f;
  hideStatus();
});

function showStatus(msg){
  csvStatus.textContent = msg;
  csvStatus.classList.remove("hidden");
}
function hideStatus(){
  csvStatus.classList.add("hidden");
}

// visuals
const barFill = document.getElementById("barFill");
const jobState = document.getElementById("jobState");
const st1 = document.getElementById("st1");
const st2 = document.getElementById("st2");
const st3 = document.getElementById("st3");
const st4 = document.getElementById("st4");
const rain = document.getElementById("rain");
const sun = document.getElementById("sun");
const cloud = document.getElementById("cloud");

function resetSteps(){ [st1,st2,st3,st4].forEach(s=>s.classList.remove("on")); }
function setStep(i){ [st1,st2,st3,st4].forEach((s,idx)=>{ if(idx<=i) s.classList.add("on"); }); }
function setProgress(p){ barFill.style.width = `${p}%`; }
function setWeatherRunning(){ rain.classList.add("on"); cloud.classList.add("on"); sun.classList.remove("on"); }
function setWeatherDone(){ rain.classList.remove("on"); cloud.classList.remove("on"); sun.classList.add("on"); }

// stats
const statsWrap = document.getElementById("statsWrap");
const rawRowsEl = document.getElementById("rawRows");
const cleanRowsEl = document.getElementById("cleanRows");
const dropRowsEl = document.getElementById("dropRows");
const dropColsEl = document.getElementById("dropCols");
const downloadBtn = document.getElementById("downloadBtn");

function showStats(s){
  statsWrap.classList.remove("hidden");

  rawRowsEl.textContent = s.raw_rows;
  cleanRowsEl.textContent = s.cleaned_rows;

  const extra = s.deduped_rows ? ` (+${s.deduped_rows} deduped)` : "";
  dropRowsEl.textContent = `${s.dropped_rows}${extra}`;

  dropColsEl.textContent = (s.dropped_cols?.length || 0);

  // ✅ same-origin download
  downloadBtn.href = s.download_url;

  drawBarChart("chartRows", ["Raw","Cleaned"], [s.raw_rows, s.cleaned_rows]);
  drawBarChart("chartCols", ["Raw","Cleaned"], [s.raw_cols, s.cleaned_cols]);
}

function drawBarChart(canvasId, labels, values){
  const c = document.getElementById(canvasId);
  const g = c.getContext("2d");

  const w = c.width = Math.max(360, c.parentElement.clientWidth - 24);
  const h = c.height = 140;

  g.clearRect(0,0,w,h);

  const max = Math.max(...values, 1);
  const pad = 18;
  const bw = (w - pad*2) / (values.length*1.6);
  const gap = bw * 0.6;

  g.globalAlpha = 0.35;
  g.strokeStyle = "white";
  g.beginPath();
  g.moveTo(pad, h-pad);
  g.lineTo(w-pad, h-pad);
  g.stroke();
  g.globalAlpha = 1;

  for(let i=0;i<values.length;i++){
    const x = pad + i*(bw+gap) + 10;
    const bh = (h - pad*2) * (values[i]/max);
    const y = (h-pad) - bh;

    g.globalAlpha = 0.9;
    g.fillStyle = "white";
    g.fillRect(x, y, bw, bh);
    g.globalAlpha = 1;

    g.fillStyle = "rgba(231,234,243,.85)";
    g.font = "12px system-ui";
    g.fillText(labels[i], x, h-6);
    g.fillText(String(values[i]), x, Math.max(12, y-6));
  }
}

// run cleaner
async function runCleaner(){
  const file = csvInput.files?.[0];
  if(!file) return;

  cleanBtn.disabled = true;
  hideStatus();
  statsWrap.classList.add("hidden");

  resetSteps();
  setProgress(0);
  setWeatherRunning();
  jobState.textContent = "Running job…";

  setStep(0); setProgress(15); await wait(250);
  setStep(1); setProgress(35); await wait(250);
  setStep(2); setProgress(65); await wait(250);

  try{
    const fd = new FormData();
    fd.append("file", file);
    Object.entries(state).forEach(([k,v])=>fd.append(k, String(v)));

    // ✅ same origin endpoint
    const res = await fetch("/clean-csv", { method:"POST", body: fd });

    if(!res.ok){
      const txt = await res.text().catch(()=>"(no response text)");
      throw new Error(`Server error ${res.status}: ${txt}`);
    }

    const stats = await res.json();

    setStep(3); setProgress(100);
    setWeatherDone();
    jobState.textContent = "Completed";

    showStats(stats);
  }catch(err){
    jobState.textContent = "Failed";
    showStatus("Error: " + (err?.message || String(err)));
    console.error(err);
  }finally{
    cleanBtn.disabled = false;
  }
}
window.runCleaner = runCleaner;

function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }
