# 📘 Project Overview

This repository contains data-driven analytics and semantic search systems covering multiple domains:

- **📈 Stock Analytics and Similarity Search**
- **🏀 Sports Data Insights**
- **🌍 Geographic Data and Visualizations**
- **🏥 Healthcare Insurance Data Processing**

Each domain is individually documented below.

---

## 📖 Table of Contents

- [📈 Stock Analytics and Similarity Search](#-stock-analytics-and-similarity-search)
  - [Data Sources](#data-sources)
  - [Data Processing](#data-processing)
  - [Semantic Search Architecture](#semantic-search-architecture)
- [🏀 Sports Data Insights](#-sports-data-insights)
  - [Data Sources](#sports-data-sources)
  - [Analysis and Visualizations](#sports-analysis-and-visualizations)
- [🌍 Geographic Data and Visualizations](#-geographic-data-and-visualizations)
  - [Geographic Data Sources](#geographic-data-sources)
  - [Mapping and Visualizations](#mapping-and-visualizations)
- [🏥 Healthcare Insurance Data Processing](#-healthcare-insurance-data-processing)
  - [Data Sources](#healthcare-data-sources)
  - [Claims and Data Extraction](#claims-and-data-extraction)
- [📚 How to Use This Repo](#-how-to-use-this-repo)
- [📦 Dependencies and Tools](#-dependencies-and-tools)
- [🛠️ Monitoring and Logging](#️-monitoring-and-logging)
- [⚠️ Important Considerations](#️-important-considerations)
- [📞 Contact & Support](#-contact--support)
- [🚀 Future Roadmap](#-future-roadmap)

---

## 📈 Stock Analytics and Similarity Search

### Data Sources
- **Alpha Vantage API**: Company descriptions, financial metrics, and historical stock prices.

### Data Processing
- Quarterly updates: Company descriptions, core financial metrics.
- Monthly updates: Selected financial indicators.
- Daily updates: Stock price and volume data.

### Semantic Search Architecture

```mermaid
flowchart TD
    AV["📡 Alpha Vantage API"]
    Airflow["🔄 Airflow Scheduler"]
    Storage["☁️ Cloud Storage (JSON snapshots)"]
    Embed["🧠 Embedding Generation"]
    Pinecone["🌲 Pinecone Vector DB"]
    NextAPI["🚀 Next.js API"]
    Frontend["🌐 React Frontend"]
    
    AV --> Airflow --> Storage --> Embed --> Pinecone --> NextAPI --> Frontend
