# 🎬 US-SEER Master CAC Script with 16:9 Chart Overlay Markers

> **Video Aspect Ratio:** 16:9 Widescreen (1920x1080)  
> **Target Duration:** 110 Seconds (1:50)  
> **Visual Style:** Dark Slate (`#0f172a`), Emerald/Cyan accents, crisp typography.

---

## I. Integrated Script & Chart Overlay Timeline

```
[0:00 - 0:12]  ACT 1: Blurred Map Hook (Text Overlay)
[0:12 - 0:25]  ACT 1: Smooth Unblur ➔ US-SEER App Pitch
[0:25 - 0:40]  ACT 2: What is PM2.5? ➔ 📊 CHART 1 OVERLAY (0:28 - 0:38)
[0:40 - 0:55]  ACT 2: NV-02 Local District Spotlight (Washoe vs. Carson City)
[0:55 - 1:10]  ACT 3: National EJ Hotspots ➔ 📊 CHART 2 OVERLAY (0:58 - 1:08)
[1:10 - 1:25]  ACT 3: CDC Social Vulnerability Index (SVI Scatter Plot)
[1:25 - 1:35]  ACT 4: Causal Policy Simulator ➔ 📊 CHART 3 OVERLAY (1:26 - 1:34)
[1:35 - 1:45]  ACT 4: Pre-Filled Briefing Memo to Rep. Mark Amodei
[1:45 - 1:50]  ACT 5: Live Methodology Page & Final URL Slate
```

---

### Act 1: The Blurred Hook & Pitch (0:00 – 0:25)

* **[0:00 – 0:12] Visual:** Dark map blurred out (40px blur). Sharp white text overlay on screen:
  > *"Air pollution kills over 100,000 Americans every year. But environmental and health data remain locked in separate federal silos."*
* **Voiceover:**  
  > *"Every year, air pollution drives tens of thousands of premature respiratory deaths across the United States. But because federal environmental, health, and economic data live in separate agency silos, local communities and lawmakers rarely see the full picture."*

* **[0:12 – 0:25] Visual:** Background **unblurs smoothly to 0px**, revealing the sharp US-SEER interactive map. Cursor highlights `US-SEER` header logo.
* **Voiceover:**  
  > *"I'm [Your Name], and I built US-SEER—a spatial analytics engine that merges five federal datasets across all 3,142 U.S. counties to uncover hidden environmental justice hotspots and simulate life-saving health policy changes."*

---

### Act 2: Science of PM₂.₅ & NV-02 Spotlight (0:25 – 0:55)

* **[0:25 – 0:40] Visual:** Map metric switches to `PM2.5 Avg (µg/m³)`.
* **🖼️ [0:28 – 0:38] OVERLAY ON SCREEN: CHART 1 (PM₂.₅ Scale & Particle Comparison)**
  - *Chart 1 pops up on the right side of the screen as a floating dark card.*
* **Voiceover:**  
  > *"At the center of our analysis is PM₂.₅—fine particulate matter 30 times smaller than a human hair. Emitted by industrial sites and vehicle exhaust, these microscopic particles penetrate deep into lung tissue and the bloodstream, driving severe respiratory disease."*

* **[0:40 – 0:55] Visual:** Click **"Zoom to NV-02"**. Map snaps to Northern Nevada. Click **Washoe County (Reno)** (`8.17 µg/m³`), then hover over **Carson City** (`116.7 / 100k mortality`).
* **Voiceover:**  
  > *"US-SEER lets users explore any congressional district nationwide. Here in Nevada's 2nd District, while Washoe County sits below the EPA's 9.0 microgram threshold, neighboring Carson City faces a respiratory mortality rate of over 116 deaths per 100,000—showing why local spatial data matters."*

---

### Act 3: National EJ Hotspots & CDC SVI (0:55 – 1:25)

* **[0:55 – 1:10] Visual:** Return to national map view. Click Marion County, TX. SidePanel opens to **Equity Tab**, displaying the `⚠️ EJ Triple-Burden Hotspot` card.
* **🖼️ [0:58 – 1:08] OVERLAY ON SCREEN: CHART 2 (Pollution Impact by Income Quartile)**
  - *Chart 2 pops up on the bottom-left corner of the screen.*
* **Voiceover:**  
  > *"Nationally, US-SEER automatically flags Environmental Justice Hotspots—counties in the bottom income quartile that suffer high pollution AND elevated mortality. In these vulnerable counties, air pollution accounts for 34% of respiratory death variance—more than double the rate in wealthy areas."*

* **[1:10 – 1:25] Visual:** Click **SVI Sub-tab**. Screen focuses on the interactive **SVI vs. Respiratory Mortality Scatter Plot**.
* **Voiceover:**  
  > *"By integrating the CDC's Social Vulnerability Index, our platform highlights how poverty, uninsured rates, and housing age compound environmental risk across four distinct vulnerability themes."*

---

### Act 4: Double Machine Learning & Policy Action (1:25 – 1:45)

* **[1:25 – 1:35] Visual:** Switch to **Policy Simulator** tab. Drag PM₂.₅ slider left to `-2.0 µg/m³`. Counters roll up: `+147 Lives Saved / Year` and `$1.61B Savings`.
* **🖼️ [1:26 – 1:34] OVERLAY ON SCREEN: CHART 3 (Double Machine Learning Confounder Matrix)**
  - *Chart 3 pops up as a clean floating card over the left panel.*
* **Voiceover:**  
  > *"To evaluate real solutions, US-SEER uses a Double Machine Learning causal model—controlling for local smoking rates, physician density, and poverty—to calculate counterfactual lives saved and official EPA economic valuations."*

* **[1:35 – 1:45] Visual:** Click **"Contact Representative"**. Congressional Policy Briefing Memo modal pops up with `mailto:` button to Rep. Mark Amodei.
* **Voiceover:**  
  > *"Constituents and staffers can instantly generate a pre-formatted Congressional Policy Briefing Memo and contact their representative with one click."*

---

### Act 5: Methodology & Outro (1:45 – 1:50)

* **[1:45 – 1:50] Visual:** Brief 2-second clip of `/sources` Live Methodology Page $\rightarrow$ transition to final end card (`US-SEER`, `us-seer.vercel.app`, GitHub link).
* **Voiceover:**  
  > *"US-SEER bridges federal data and local action, with full open-source methodology transparently documented at us-seer.vercel.app. Thank you!"*

---

## II. Ready-to-Copy ChatGPT / Code Prompts for 16:9 Charts

Copy and paste these exact prompts into ChatGPT (or DALL-E / Python Matplotlib) to generate perfectly dimensioned 16:9 graphic overlays that match US-SEER's dark slate UI!

---

### 🎨 Prompt for CHART 1: PM₂.₅ Relative Size Diagram
> **Copy & Paste into ChatGPT (DALL-E 3 or Python Matplotlib):**
```text
Generate a clean, high-resolution 16:9 widescreen (1920x1080) educational infographic diagram on a dark slate background (#0f172a). 
Title: "What is PM2.5 Fine Particulate Matter?" in bold white modern sans-serif font.
Include visual size comparisons:
1. A large strand labeled "Human Hair (~70 µm)" in muted slate blue.
2. A medium circle labeled "PM10 Dust & Pollen (10 µm)" in cyan (#38bdf8).
3. A tiny glowing red/amber circle labeled "PM2.5 Fine Particles (2.5 µm)" with text callout: "30x smaller than human hair — penetrates deep into lungs & bloodstream".
Style: Minimalist, clean UI card, dark mode, high contrast, professional scientific graphic, zero clutter. 16:9 aspect ratio.
```

---

### 🎨 Prompt for CHART 2: Income Quartile vs PM₂.₅ Variance (The 34% Finding)
> **Copy & Paste into ChatGPT (DALL-E 3 or Python Matplotlib):**
```text
Create a clean, sleek 16:9 widescreen (1920x1080) horizontal bar chart infographic on a dark navy background (#0f172a).
Title: "PM2.5 Impact on Respiratory Death Rates by Income" in crisp white sans-serif.
Show two horizontal comparison bars:
1. Top Bar: "Lowest Income Quartile (Poorest Counties)" — Bar length 34.2%, colored vibrant rose/coral (#ef4444) with bold text overlay "34.2% Variance Explained".
2. Bottom Bar: "Highest Income Quartile (Wealthiest Counties)" — Bar length 14.8%, colored muted cyan (#38bdf8) with bold text overlay "14.8% Variance Explained".
Add a callout badge: "⚡ 2.3x Higher Vulnerability Burden in Low-Income Counties".
Style: Modern dark dashboard card, glowing accents, pristine 16:9 aspect ratio, clean typography.
```

---

### 🎨 Prompt for CHART 3: Double Machine Learning Confounder Matrix
> **Copy & Paste into ChatGPT (DALL-E 3 or Python Matplotlib):**
```text
Generate a sleek 16:9 widescreen (1920x1080) floating UI info-card diagram on a dark slate background (#0f172a).
Title: "Double Machine Learning (DML) Causal Inference Model" in bold white.
Subtitle: "Isolating True PM2.5 Causal Effect from Confounders (Robinson PLM 1988)" in muted gray.
Layout:
- Left Column: "Raw Correlation" -> +0.42 (Muted Gray)
- Center Column: "DML Causal Effect (θ)" -> +1.47 deaths/100k per 1 µg/m³ PM2.5 (Vibrant Emerald #10b981)
- Right Column: "Controlled Confounder Matrix" showing 4 mini badges with checkmarks:
  [✓ Adult Smoking Rate]
  [✓ Median Household Income / Poverty]
  [✓ Physician Density per 100k]
  [✓ USDA Rural-Urban Code (RUCC)]
Style: Modern SaaS UI card, dark mode, glowing emerald accents, crisp 16:9 layout.
```
