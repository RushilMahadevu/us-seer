# 📊 US-SEER Data Sources & Epidemiological Methodology

> **Comprehensive Federal Data Catalog, Data Provenance, Causal ML Specification, and Epistemological Limitations**

US-SEER integrates 11 federal databases across all 3,142 U.S. counties, standardizing disparate environmental hazard exposures, health outcomes, demographic attributes, and healthcare infrastructure metrics onto a unified 5-digit county FIPS geospatial grid.

---

## 🏛️ Federal Datasets Catalog

| Dataset Name                                | Responsible Federal Agency                        | Category                      | Date Range / Coverage                    | Primary Join Key                    | Key Variables & Metric Codes                                                     | Direct Federal Portal Link                                                                                             |
| :------------------------------------------ | :------------------------------------------------ | :---------------------------- | :--------------------------------------- | :---------------------------------- | :------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **CDC Compressed Mortality & WONDER**       | Centers for Disease Control & Prevention (CDC)    | Health Outcome                | **2018–2022** (5-Yr Aggregate)           | 5-Digit County FIPS                 | Respiratory Mortality (`mortalityRate`, J40–J47), Total Deaths (`deaths`)        | [CDC WONDER Portal](https://wonder.cdc.gov/)                                                                           |
| **EPA Air Quality System (AQS)**            | U.S. Environmental Protection Agency (EPA)        | Environmental                 | **2020–2024** (Daily/Annual)             | Station Lat/Lon → FIPS              | Annual Mean $\text{PM}_{2.5}$ (`pm25Avg`, $\mu\text{g/m}^3$)                     | [EPA AQS Data Portal](https://www.epa.gov/aqs)                                                                         |
| **CDC PLACES (Local Data)**                 | CDC & Robert Wood Johnson Foundation              | Health Outcome & Behavioral   | **2023 Release** (2021–2022 Survey Data) | 5-Digit County FIPS                 | COPD Prev (`copdPrev`), Asthma Prev (`asthmaPrev`), Smoking Rate (`smokingPrev`) | [CDC PLACES Data](https://data.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-County-Data-20/swc5-untb) |
| **U.S. Census Bureau ACS 5-Year**           | U.S. Census Bureau                                | Socioeconomic & Equity        | **2018–2022** (5-Year Rolling)           | State + County FIPS                 | Income (`B19013`), Poverty (`B17001`), Uninsured (`B27001`), Race (`B03002`)     | [Census ACS Portal](https://www.census.gov/programs-surveys/acs)                                                       |
| **EPA Toxic Release Inventory (TRI)**       | U.S. Environmental Protection Agency (EPA)        | Environmental                 | **2022–2024** Reporting Years            | Facility Lat/Lon → FIPS Aggregation | Total Chemical Releases (`toxicReleases`, lbs/yr), Carcinogens                   | [EPA TRI Portal](https://www.epa.gov/toxics-release-inventory-tri-program)                                             |
| **HHS Area Health Resources Files (AHRF)**  | Health Resources & Services Administration (HRSA) | Socioeconomic & Health Access | **2022–2023** Release                    | 5-Digit County FIPS                 | Primary Care MD Density (`mdRate`, `F11978`), Hospital Beds (`F0892110`)         | [HRSA AHRF Data](https://data.hrsa.gov/topics/health-workforce/nchwa/ahrf)                                             |
| **USDA Rural-Urban Continuum Codes (RUCC)** | USDA Economic Research Service                    | Socioeconomic & Urbanicity    | **2023** Update                          | 5-Digit County FIPS                 | RUCC Code (`rucc`, 1–9 Index score)                                              | [USDA ERS RUCC Portal](https://www.ers.usda.gov/data-products/rural-urban-continuum-codes/)                            |
| **US-SEER Overall Vulnerability Index**     | Derived Spatial Analytics Engine                  | Composite Risk Metric         | **Real-Time Computed** (2024 Baseline)   | Derived per FIPS                    | Overall Risk Score (`overallRisk`, 0–100 Normalized)                             | In-App Engine                                                                                                          |
| **CDC Social Vulnerability Index (SVI)**    | CDC / ATSDR                                       | Equity & Vulnerability        | **2020 / 2022** Release                  | 5-Digit County FIPS                 | Overall SVI (`RPL_THEMES`, 0–1 Percentile), SES Rank (`RPL_THEME1`)              | [CDC ATSDR SVI Portal](https://www.atsdr.cdc.gov/placeandhealth/svi/index.html)                                        |
| **NOAA U.S. Climate Normals**               | NOAA National Centers for Environmental Info      | Environmental                 | **1991–2020** (30-Yr Normals)            | Station Join → FIPS                 | 30-Yr Mean Temp (`TAVG`), Atmospheric Stagnation Index                           | [NOAA Climate Normals](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals)                       |
| **BLS Occupational Employment Statistics**  | U.S. Bureau of Labor Statistics                   | Socioeconomic & Workplace     | **2023** Annual Release                  | County / MSA FIPS                   | Mining Share (`OCC_47_5000`), Manufacturing Share (`OCC_51_0000`)                | [BLS OES Portal](https://www.bls.gov/oes/)                                                                             |
| **USGS Water Quality Data (NWIS)**          | U.S. Geological Survey                            | Environmental (Multi-Media)   | **2022–2024**                            | HUC Watershed → FIPS                | Nitrate Concentration (`p00620`), Arsenic Detection (`p01000`)                   | [USGS NWIS Portal](https://waterdata.usgs.gov/nwis)                                                                    |

---

## 🔬 Epidemiological & Causal Machine Learning Methodology

US-SEER isolates the true attributable effect of fine particulate matter ($\text{PM}_{2.5}$) on chronic respiratory disease mortality using **Double Machine Learning (DML)** (Robinson 1988; Chernozhukov et al. 2018).

### 1. Robinson's Partially Linear Model
$$\text{Mortality}_i = \theta \cdot \text{PM2.5}_i + g(W_i) + U_i$$
$$\text{PM2.5}_i = m(W_i) + V_i$$

Where:
- $\text{Mortality}_i$: Age-adjusted chronic lower respiratory disease mortality rate per 100,000 residents in county $i$.
- $\text{PM2.5}_i$: Annual mean ambient $\text{PM}_{2.5}$ concentration ($\mu\text{g/m}^3$).
- $W_i$: Confounder vector comprising local smoking prevalence, poverty rate, uninsured rate, primary care physician density, racial/ethnic composition, and USDA Rural-Urban Continuum Code (RUCC).
- $\theta$: Target causal effect parameter representing avoided mortality per $1\,\mu\text{g/m}^3$ reduction in $\text{PM}_{2.5}$.
- $g(W_i), m(W_i)$: Flexible non-linear nuisance functions estimated via 5-fold cross-fitted Random Forest regressions (`scikit-learn`).

### 2. Multi-Variable Confounder Matrix
US-SEER explicitly controls for key confounders to eliminate bias:
1. **Smoking Prevalence (CDC PLACES):** Eliminates behavioral tobacco confounding.
2. **Healthcare Access (HRSA AHRF MD Density):** Controls for provider shortages and delayed medical intervention.
3. **Socioeconomic Deprivation (Census ACS Poverty & Uninsured):** Isolates environmental hazard risk from economic hardship.
4. **Urbanicity & Traffic Burden (USDA RUCC):** Distinguishes dense metropolitan traffic corridor pollution from rural dust.

---

## ⚠️ Known Limitations & Epistemological Caveats

To maintain full scientific transparency and intellectual honesty, US-SEER explicitly documents four primary methodological limitations:

### 1. The Ecological Fallacy
US-SEER operates on county-level spatial aggregations ($N = 3,142$ U.S. counties). Observed population-level correlations between average county air pollution and aggregate mortality rate **cannot be directly extrapolated to individual health risk** without personal bio-monitoring or cohort tracking.

### 2. CDC Mortality Value Suppression & Privacy Bounds
The CDC WONDER database suppresses death counts between 1 and 9 deaths per county per year to prevent individual re-identification. In rural, low-population counties, respiratory deaths may be flagged as `Suppressed`. US-SEER handles suppressed values through state-level baseline imputation and spatial bounding rather than silent zeroing.

### 3. Satellite AOD Remote Sensing & Spatial Kriging Interpolation
Ground-level EPA AQS monitoring stations are densely deployed in urban centers but sparse across rural regions. Rural $\text{PM}_{2.5}$ levels rely on satellite Aerosol Optical Depth (AOD) remote sensing models and spatial kriging interpolation. While satellite AOD provides full continental coverage, localized microclimate inversions or fence-line point sources may be smoothed.

### 4. Residual Unmeasured Confounding
While US-SEER controls for six major confounders (smoking, poverty, insurance, MD density, race, and urbanicity), unmeasured micro-environmental variables—such as indoor radon exposure, housing insulation quality, occupational silica/dust exposure, and historical industrial legacies—may account for residual variance in specific regions.

---

## 📄 Academic Citation & Data Provenance Statement

When referencing US-SEER analytical outputs or data layer aggregations in academic publications, journalism, or policy briefings, please use the following citation format:

```text
US-SEER Spatial Analytics Engine (2024). "U.S. Spatial Environmental Exposure & Respiratory Risk Index." 
Integrated Federal Data Pipeline (CDC WONDER 2018–2022, EPA AQS 2020–2024, Census ACS 2018–2022, CDC PLACES 2023, EPA TRI 2022–2024, HRSA AHRF 2022–2023). 
Methodology: Double Machine Learning Causal Inference (Robinson 1988; Chernozhukov et al. 2018). Available at: https://us-seer.vercel.app/
```
