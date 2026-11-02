# Dashboard Analysis — Gelar Rasa 2026
> **Theme:** *"From Roots to Clarity, Revealing Meaningful Insight Through Data"*

This repository contains the end-to-end data processing pipeline, exploratory analyses, and interactive web dashboard for the **Dashboard Analysis (DA) Gelar Rasa 2026** competition.

---

## 📁 Repository Structure

```
.
├── Dataset/
│   ├── raw/
│   │   ├── aqms/                   # 27 Station hourly CSV telemetry (raw)
│   │   ├── health/                 # HLT-01 daily hospital surveillance (raw)
│   │   ├── master/                 # sites.csv, sensors.csv, hospitals.csv
│   │   ├── metadata/               # metadata_dates.csv, metadata_sensors.csv
│   │   └── archive/                # Original zip archive backup
│   ├── processed/                  # Aggregated & preprocessed datasets (resampled)
│   └── dashboard_exports/          # Compact JSON datasets (<2MB) feeding the dashboard
├── notebooks/                      # Data wrangling, EDA & modeling scripts
├── dashboard/                      # Web dashboard application (HTML5/CSS3/JavaScript)
├── .gitignore                      # Git exclusion rules for large datasets
├── .gitattributes                 # Normalized line endings & binary file tracking
├── CASE_STUDY_CONTEXT.md           # In-depth case study & competition guidelines
├── Booklet Case Study DA Gelar Rasa 2026.pdf
└── HANDBOOK PRELIMINARY ROUND DA GELAR RASA 2026.pdf
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.10+** (Recommended packages: `pandas`, `numpy`, `scipy`, `matplotlib`, `seaborn`)
- **Modern Web Browser** (Chrome / Edge / Firefox)

### 2. Environment Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd GLRS

# Optional: Set up virtual environment
python -m venv venv
venv\Scripts\activate   # Windows

# Install common data science dependencies
pip install pandas numpy scipy
```

### 3. Pipeline Workflow
1. **Raw Telemetry & Master Tables:** Located under `Dataset/raw/`.
2. **Preprocessing & Aggregation:** Run scripts under `notebooks/` to clean QC flags and resample 660,000+ hourly rows into daily summaries.
3. **Frontend JSON Exports:** Outputs are saved to `Dataset/dashboard_exports/`.
4. **Interactive Dashboard:** Launch `dashboard/index.html` locally or deploy via GitHub Pages / Vercel.

---

## 📊 Deliverables & Submission Checklist

- [ ] **Interactive Dashboard:** URL named `DA2026_Dashboard_NamaTim_NamaKetua` (Features official Gelar Rasa logo).
- [ ] **Analysis Report:** PDF named `DA2026_Laporan_NamaTim_NamaKetua.pdf` (Strictly follows official template).
- [ ] **Submission Deadline:** 14 November 2026, 23:59 WIB.

