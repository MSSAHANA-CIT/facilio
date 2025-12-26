from flask import Flask, request, jsonify, send_from_directory, render_template
import pandas as pd
import os, re, uuid

app = Flask(__name__, template_folder="templates", static_folder="static")

BASE_DIR = os.path.dirname(__file__)
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
PROCESSED_FOLDER = os.path.join(BASE_DIR, "processed")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

def to_snake(s: str) -> str:
    s = str(s).strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s-]+", "_", s)
    return s.lower()

# ---------------- UI ROUTES ----------------
@app.get("/")
def ui_home():
    return render_template("home.html")

@app.get("/toolkit")
def ui_toolkit():
    return render_template("toolkit.html")

@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "FACILIO backend running"}), 200

# ---------------- API ROUTES ----------------
@app.post("/clean-csv")
def clean_csv():
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "No file uploaded"}), 400

    trim_headers = request.form.get("trim_headers", "true").lower() == "true"
    normalize_headers = request.form.get("normalize_headers", "true").lower() == "true"
    trim_cells = request.form.get("trim_cells", "true").lower() == "true"
    drop_empty_rows = request.form.get("drop_empty_rows", "true").lower() == "true"
    drop_empty_cols = request.form.get("drop_empty_cols", "false").lower() == "true"
    dedupe_rows = request.form.get("dedupe_rows", "false").lower() == "true"

    upload_name = f"{uuid.uuid4().hex}_{f.filename}"
    upload_path = os.path.join(UPLOAD_FOLDER, upload_name)
    f.save(upload_path)

    # robust read
    df = pd.read_csv(upload_path, skipinitialspace=True)

    raw_rows = int(len(df))
    raw_cols = int(len(df.columns))

    # headers
    cols = list(df.columns)
    if trim_headers:
        cols = [str(c).strip() for c in cols]
    if normalize_headers:
        cols = [to_snake(c) for c in cols]
    df.columns = cols

    # trim string cells
    if trim_cells:
        for c in df.columns:
            if df[c].dtype == object:
                df[c] = df[c].astype(str).str.strip()

    dropped_rows = 0
    if drop_empty_rows:
        before = len(df)
        df = df.replace(r"^\s*$", pd.NA, regex=True)
        df = df.dropna(how="all")
        dropped_rows = int(before - len(df))

    dropped_cols = []
    if drop_empty_cols:
        before_cols = list(df.columns)
        keep = []
        for c in before_cols:
            series = df[c]
            if series.dtype == object:
                if series.astype(str).str.strip().replace("nan", "").ne("").any():
                    keep.append(c)
            else:
                if series.notna().any():
                    keep.append(c)
        dropped_cols = [c for c in before_cols if c not in keep]
        df = df[keep]

    deduped_rows = 0
    if dedupe_rows:
        before = len(df)
        df = df.drop_duplicates()
        deduped_rows = int(before - len(df))

    cleaned_rows = int(len(df))
    cleaned_cols = int(len(df.columns))

    out_name = f"cleaned_{uuid.uuid4().hex}.csv"
    out_path = os.path.join(PROCESSED_FOLDER, out_name)
    df.to_csv(out_path, index=False)

    stats = {
        "raw_rows": raw_rows,
        "cleaned_rows": cleaned_rows,
        "dropped_rows": dropped_rows,
        "deduped_rows": deduped_rows,
        "raw_cols": raw_cols,
        "cleaned_cols": cleaned_cols,
        "dropped_cols": dropped_cols,
        "final_columns": list(df.columns),
        "download_url": f"/download/{out_name}"
    }
    return jsonify(stats), 200

@app.get("/download/<path:filename>")
def download(filename):
    return send_from_directory(PROCESSED_FOLDER, filename, as_attachment=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)

