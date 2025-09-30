# 📘 The Data Project

The data project is web app that contains data analytics and semantic search systems covering multiple domains:

- **📈 Stock Analytics and Similarity Search**
- **🏀 Sports Data Insights**
- **🌍 Geographic Data and Visualizations**
- **🏥 Healthcare Insurance Data Processing**

Each domain is individually documented below.

---

## 📖 Table of Contents

- [📈 Stock Analytics and Similarity Search](#-stock-analytics-and-similarity-search)

- [🏀 Sports Data Insights](#-sports-data-insights)

- [🌍 Geographic Data and Visualizations](#-geographic-data-and-visualizations)

- [🏥 Healthcare Insurance Data Processing](#-healthcare-insurance-data-processing)

---

## 📈 Stock Analytics and Similarity Search

### Data Sources
- **Alpha Vantage API**: Company descriptions, financial metrics, and historical stock prices.

![Alt text](/company_flowchart.png "Title")

Stock prices, quarterly financials, and company descriptions are ingested from Alpha Vantage via scheduled Airflow jobs. Company descriptions and financials are transformed into embeddings in Python via Hugging Face and stored in Pinecone, enabling similarity search across public companies. Various trading signals (Z-score, moving averages, and RSI) are calculated on the share price in a daily scheduled Airflow job and then is archived in Google Cloud Storage (GCS) as json objects. The Next.js application serves as the front end, pulling data from Pinecone for related-company insights and from GCS for historical signals and the backtested results.




## 🏀 Sports Data Insights

Individual player statistics, Game score/schedule, and team statistics are ingested using NBA API in a managed Airflow insantance (MWAA) and stored in Amazon Redshift. The data is aggregated and expanded on in DBT, sent to the front end for consumption.
![Alt text](/NBA_flowchart.png "Title")
