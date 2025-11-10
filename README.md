# What is The Data Project

The Data Project is an open-source, data-driven platform that brings together interactive dashboards and visualizations across a wide range of topics—from finance and markets to sports, politics, and more. Each page is designed to make complex information engaging and intuitive, letting users explore patterns, compare metrics, and discover insights in real time.

- ** Stock Analytics and Similarity Search**
- ** Sports Data Insights**
- ** Geographic Data and Visualizations**
- ** Healthcare Insurance Data Processing**

Each domain is individually documented below.

---

## 📖 Table of Contents

- [ Stock Analytics and Similarity Search](#-stock-analytics-and-similarity-search)

- [ Sports Data Insights](#-sports-data-insights)

- [ Demographic Data and Visualizations](#-geographic-data-and-visualizations)

- [ Healthcare Insurance Data Processing](#-healthcare-insurance-data-processing)

---

##  Stock Analytics and Similarity Search

### Data Sources
- **Alpha Vantage API**: Company descriptions, financial metrics, and historical stock prices.

![Alt text](/company_flowchart.png "Title")

Stock prices, quarterly financials, and company descriptions are ingested from Alpha Vantage via scheduled Airflow jobs. Company descriptions and financials are transformed into embeddings in Python via Hugging Face and stored in Pinecone, enabling similarity search across public companies. Various trading signals (Z-score, moving averages, and RSI) are calculated on the share price in a daily scheduled Airflow job and then is archived in Google Cloud Storage (GCS) as json objects. The Next.js application serves as the front end, pulling data from Pinecone for related-company insights and from GCS for historical signals and the backtested results.




##  Sports Data Insights

### Data Sources
- **NBA API**: Player stats, game stats, team stats, and schedules.


Individual player statistics, Game score/schedule, and team statistics are ingested using NBA API in a managed Airflow insantance (MWAA) and stored in Amazon Redshift. The data is aggregated and expanded on in DBT, sent to the front end for consumption.
![Alt text](/NBA_flowchart.png "Title")

##  Demographic Data

### Data Sources
- **Census.gov**: Regional shapefiles and demographic data.

