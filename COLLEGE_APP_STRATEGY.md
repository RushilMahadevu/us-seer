# From Codebase to College App: Making This Project Land

You have built something genuinely uncommon for a high school student. Most applicants list "I made a website." You have cross-referenced three federal databases, built a real data engineering pipeline, and produced a tool that visualizes a measurable public health crisis.

Here is how to take it the rest of the way.

---

## What You Have Already Done (That Matters)

This is not a tutorial project. Be clear on that when you write about it.

- You cleaned and merged **three federal datasets** (CDC WONDER, EPA PM2.5, Census ACS) covering **3,100+ US counties**
- You handled real-world data messiness: CDC suppression flags, metadata footers, mismatched county name formats
- You built a **full data pipeline** (Python → JSON → Next.js) with a reproducible architecture
- You used **modeled PM2.5 satellite/prediction data**, not just monitor-based readings, achieving 96% county coverage
- The question you are asking — *do communities with higher air pollution have higher rates of chronic respiratory death?* — is an active area of environmental epidemiology research

---

## The Analyses That Will Elevate This

Right now the dashboard shows data side by side. To make it a genuine research tool, add these layers:

### 1. Correlation Analysis (High Impact, Doable in Python)
Run a simple Pearson or Spearman correlation between `pm25Avg` and `mortalityRate` across all counties. Then break it down by:
- Urban vs. rural counties (use Census Rural-Urban Continuum Codes)
- Income quartile (you already have `medianIncome`)
- State

**Why it matters:** If you can show that the correlation between PM2.5 and respiratory mortality is significantly stronger in low-income counties than high-income ones, that is an environmental justice finding. That sentence alone belongs in a college essay.

### 2. Outlier Counties (The Stories Worth Telling)
Find counties with high PM2.5 but low mortality (protective factors?) and counties with low PM2.5 but high mortality (other drivers?). These are your "surprising findings" that show you are thinking like a researcher, not just a coder.

```python
# In your Python pipeline — add to process_data.py
merged_df['residual'] = merged_df['mortalityRate'] - merged_df['mortalityRate'].mean()
high_pm25_low_mortality = merged_df[
    (merged_df['pm25Avg'] > merged_df['pm25Avg'].quantile(0.75)) &
    (merged_df['mortalityRate'] < merged_df['mortalityRate'].quantile(0.25))
]
```

### 3. Income Stratification
Split all counties into four income quartiles and calculate the average PM2.5 and average mortality rate for each group. If the poorest quartile shows both the highest PM2.5 and the highest mortality, you have quantified environmental injustice with real government data.

### 4. Temporal Trend (The COVID Question)
The CDC WONDER and PM2.5 data both cover 2018–2022. During 2020, lockdowns drastically cut vehicle emissions nationally — PM2.5 dropped in many metropolitan areas. Did respiratory mortality also drop in high-pollution counties in 2020? Running this by year tests an actual causal hypothesis with a natural experiment.

---

## How to Frame This for Applications

### For the Activities Section
> **Geospatial Public Health Dashboard** | Independent Research Project  
> Built a full-stack web application cross-referencing CDC, EPA, and Census data across 3,100+ US counties to analyze the relationship between air quality (PM2.5) and chronic respiratory disease mortality. Designed the data engineering pipeline in Python and the interactive front-end in Next.js/React.

### For the Essay (If This Is Your Main Project)
Do not write about the code. Write about the moment you looked at the map and realized a pattern.

*Example angle:* "When I overlaid PM2.5 concentrations with respiratory mortality rates, the counties that lit up red were not random. They followed freeways. They followed river valleys where industrial plants cluster. They were overwhelmingly counties where median household income fell below $40,000."

That is your hook. The rest of the essay is about why that matters and what you plan to do about it.

### For STEM-Specific Applications (Research Programs, Scholarships)
Lead with methodology:
- What is your research question?
- What data sources did you use and why?
- What are the limitations of your analysis? (Ecological fallacy, confounders like smoking rates, access to healthcare)
- What would you do with more time or resources?

Acknowledging limitations demonstrates intellectual maturity that most applicants never show.

---

## Real-World Impact Angles

### Submit It Somewhere
- **Congressional App Challenge** — open to all US students, this project is exactly what it is designed for
- **Junior Science and Humanities Symposium (JSHS)** — accepts independent research
- **Regeneron Science Talent Search** — if you add a formal statistical analysis section
- **Local or state environmental agencies** — some accept student research presentations

### Make It Publicly Accessible
Deploy it on Vercel (you are already planning this). A live URL you can share is worth ten screenshots.

Add a brief "Methodology" page explaining your data sources, date ranges, and known limitations. This signals to anyone reading that you understand research ethics and transparency.

### Write It Up
A 1,500-word writeup in the style of a science paper — Introduction, Data & Methods, Results, Limitations, Conclusion — is something you can attach to any application that asks for a research sample or portfolio. It is also the foundation of a submission to a student research journal.

---

## The Honest Limitations to Acknowledge

Being upfront about these makes you look smarter, not weaker.

| Limitation | What It Means |
|---|---|
| **Ecological fallacy** | County-level correlation does not prove individual-level causation |
| **Confounders** | Smoking rates, occupational exposure, and healthcare access all affect mortality |
| **PM2.5 is modeled** | The predictions are good but not the same as a physical monitor reading |
| **Suppressed CDC data** | ~250 counties have fewer than 10 deaths and are excluded from CDC reports |
| **Cross-sectional snapshot** | 2018–2022 averages do not capture year-to-year causality |

---

## The Sentence That Wins Admissions Officers

Most students build projects to learn a skill. You built a project that asks a question. There is a difference.

The question — *do the places where people breathe the worst air also have the highest rates of respiratory death, and does poverty determine who is most exposed?* — is one that public health researchers, environmental lawyers, and policy makers spend careers on.

You are a high school student with a live URL and 5.6 million rows of EPA data who started asking it too.

That is the essay.
