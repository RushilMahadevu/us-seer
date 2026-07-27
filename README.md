# 🇺🇸 US-SEER: US Spatial Environmental Exposure & Respiratory Risk Index

**US-SEER** (*US Spatial Environmental Exposure & Respiratory Risk Index*) is a high-performance web platform and spatial analytics engine designed to investigate the complex relationships between ambient air quality ($\text{PM}_{2.5}$), toxic industrial releases, socioeconomic vulnerability, and respiratory disease mortality across all 3,142 U.S. counties.

---

## 💡 Simple Explanation

### What does US-SEER do?
US-SEER maps and analyzes environmental health hazards across the United States at the county level. It connects environmental exposure data with public health outcomes to reveal environmental injustice and community risk factors.

### How does it work?
1. **Data Aggregation**: US-SEER combines multi-source federal datasets (EPA Air Quality & TRI, CDC Mortality & PLACES, US Census Demographics) indexed by 5-digit county **FIPS codes**.
2. **Interactive Spatial Map**: An interactive choropleth map allows users to filter by specific pollutants or health metrics (e.g., Fine Particulate Matter vs. COPD Mortality Rates).
3. **Policy Simulator**: Users can adjust hypothetical environmental policies (e.g., reducing $\text{PM}_{2.5}$ emissions by 15%) to project potential lives saved and health outcomes across different demographic strata.
4. **Statistical Correlation**: Bivariate maps and scatter-analytics help identify whether poor air quality directly drives respiratory disease, even after controlling for smoking rates and poverty levels.

---

## ⚡ Core Features

- 🗺️ **Interactive County-Level Map**: High-performance SVG map with smooth zoom/pan and hover analytics powered by `react-simple-maps` and `d3-scale`.
- 📊 **Multi-Variable Overlay**: Toggle between environmental factors ($\text{PM}_{2.5}$, Toxic Release Inventory), health outcomes (COPD mortality, asthma), and demographics (poverty, uninsured rate, median income).
- 🔍 **County Search & Recenter**: Instant search across 3,000+ U.S. counties, states, and metro areas.
- 🧮 **Policy Simulation Engine**: Interactive policy modeling tool with customizable sliders to simulate environmental interventions.
- 🎨 **Modern Sleek UI**: Built with Next.js 16, Tailwind CSS v4, Lucide icons, and sleek dark mode theming.

---

## 📂 Data Sources & Architecture

The project processes and unifies datasets across several primary federal databases:

| Source | Metric / Variable | Level |
| :--- | :--- | :--- |
| **EPA AQS / AirNow** | Ambient $\text{PM}_{2.5}$ concentrations ($\mu g / m^3$) | County |
| **EPA TRI** | Toxic Release Inventory (industrial chemical releases) | Facility / County |
| **CDC WONDER & PLACES** | COPD & Respiratory Disease Mortality rates, Smoking prevalence | County |
| **US Census Bureau (ACS)** | Median Household Income, Poverty %, Uninsured %, Demographics | County |

For a complete breakdown of data pipeline scripts and deep-dive datasets, see [`DATA_SOURCES.md`](DATA_SOURCES.md).

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

### Local Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/RushilMahadevu/US-SEER.git
   cd US-SEER
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Build & Deployment

To verify and create a production build locally:

```bash
npm run build
npm run start
```

### Automated Vercel Deployment
US-SEER is optimized for seamless deployment on **Vercel**:
- Data pipeline scripts and raw data files are managed via `.vercelignore` to maintain fast serverless builds under Vercel's payload limits.
- Every push to the `main` branch automatically triggers a production build.
