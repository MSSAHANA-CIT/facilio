// ---------- Tabs ----------
function showTab(which){
  const org = document.getElementById("panelOrg");
  const csv = document.getElementById("panelCsv");
  const tabOrg = document.getElementById("tabOrg");
  const tabCsv = document.getElementById("tabCsv");
  const ind = document.getElementById("tabIndicator");

  if(which === "org"){
    org.classList.remove("hidden");
    csv.classList.add("hidden");
    tabOrg.classList.add("active");
    tabCsv.classList.remove("active");
    ind.style.transform = "translateX(0%)";
  } else {
    csv.classList.remove("hidden");
    org.classList.add("hidden");
    tabCsv.classList.add("active");
    tabOrg.classList.remove("active");
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

filesInput.addEventListener("change", (e) => {
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
    box.innerHTML = `
      <div class="k">${ext}</div>
      <div class="s">${arr.length} files • ${fmtBytes(size)}</div>
    `;
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

// ---------- CSV Cleaner Toggles ----------
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
  if(on) el.classList.add("on");
  else el.classList.remove("on");
}

function flip(key){
  state[key] = !state[key];
  setSwitch(key, state[key]);
}
window.flip = flip;

// init switches
Object.keys(state).forEach(k => setSwitch(k, state[k]));

// CSV upload
const csvInput = document.getElementById("csvFile");
const csvName = document.getElementById("csvName");
const cleanBtn = document.getElementById("cleanBtn");
const csvStatus = document.getElementById("csvStatus");

csvInput.addEventListener("change", (e)=>{
  const f = e.target.files?.[0] || null;
  csvName.textContent = f ? f.name : "No CSV selected";
  cleanBtn.disabled = !f;
  csvStatus.classList.add("hidden");
});

function showStatus(msg){
  csvStatus.textContent = msg;
  csvStatus.classList.remove("hidden");
}

async function uploadCSV(){
  const file = csvInput.files?.[0];
  if(!file) return;

  cleanBtn.disabled = true;
  showStatus("Cleaning CSV… Please wait.");

  const fd = new FormData();
  fd.append("file", file);

  // send toggles to backend
  Object.entries(state).forEach(([k,v]) => fd.append(k, String(v)));

  try{
    const res = await fetch("http://127.0.0.1:5000/clean-csv", {
      method: "POST",
      body: fd
    });

    if(!res.ok){
      const txt = await res.text();
      throw new Error(`Server error (${res.status}): ${txt}`);
    }

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cleaned_${file.name.replace(/\s+/g,"_")}`;
    a.click();
    URL.revokeObjectURL(a.href);

    showStatus("Done. Cleaned CSV downloaded successfully.");
  }catch(err){
    showStatus("Error: " + (err?.message || String(err)));
  }finally{
    cleanBtn.disabled = false;
  }
}
window.uploadCSV = uploadCSV;
