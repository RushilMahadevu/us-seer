import pandas as pd
import requests
import os

API_KEY = "cd9ac17eea41333c5d1d6ee8a6061a89e1b0513f"  # Census API Key from .env

# Variables:
# B01001_001E = Total Population
# B19013_001E = Median Household Income
# B17001_002E = Population below poverty line (Total: B17001_001E)
# B27001_005E = Uninsured males under 6 (part of uninsured calculation, or direct uninsured count)
# For Census Variables specified in DATA_SOURCES.md:
# % below poverty line: B17001_002E / B17001_001E
# % without health insurance: B27001_005E / B01001_001E
# % Non-Hispanic Black: B03002_004E / B03002_001E
# % Hispanic: B03002_012E / B03002_001E
# Median age: B01002_001E
# % without a high school diploma: B15003_002E / B01001_001E
# Housing units pre-1940: B25034_011E

VARS = [
    "NAME",
    "B01001_001E", # Total Population
    "B19013_001E", # Median Household Income
    "B17001_001E", # Poverty Total Base
    "B17001_002E", # Below Poverty Count
    "B27001_005E", # Uninsured Count
    "B03002_001E", # Race/Ethnicity Total Base
    "B03002_004E", # Non-Hispanic Black Count
    "B03002_012E", # Hispanic Count
    "B01002_001E", # Median Age
    "B15003_002E", # No High School Diploma Count
    "B25034_011E", # Pre-1940 Housing Units Count
]

var_string = ",".join(VARS)
url = f"https://api.census.gov/data/2022/acs/acs5?get={var_string}&for=county:*&key={API_KEY}"

response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    headers = data[0]
    rows = data[1:]

    df = pd.DataFrame(rows, columns=headers)

    # Combine State + County codes into a 5-digit FIPS code
    df["FIPS"] = df["state"].str.zfill(2) + df["county"].str.zfill(3)

    # Convert numeric columns
    num_cols = VARS[1:]
    for col in num_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Rename base columns
    df = df.rename(
        columns={
            "B01001_001E": "Population",
            "B19013_001E": "Median_Income",
            "B01002_001E": "Median_Age",
            "B25034_011E": "Housing_Pre1940",
            "NAME": "County_Name",
        }
    )

    df.loc[df["Median_Income"] < 0, "Median_Income"] = None
    df.loc[df["Median_Age"] < 0, "Median_Age"] = None

    # Calculate percentages / metrics
    df["Pct_Poverty"] = (df["B17001_002E"] / df["B17001_001E"] * 100).round(2)
    df["Pct_Uninsured"] = (df["B27001_005E"] / df["Population"] * 100).round(2)
    df["Pct_Black"] = (df["B03002_004E"] / df["B03002_001E"] * 100).round(2)
    df["Pct_Hispanic"] = (df["B03002_012E"] / df["B03002_001E"] * 100).round(2)
    df["Pct_No_HS"] = (df["B15003_002E"] / df["Population"] * 100).round(2)

    # Select final columns
    final_cols = [
        "FIPS",
        "County_Name",
        "Population",
        "Median_Income",
        "Pct_Poverty",
        "Pct_Uninsured",
        "Pct_Black",
        "Pct_Hispanic",
        "Median_Age",
        "Pct_No_HS",
        "Housing_Pre1940",
    ]
    final_df = df[final_cols]

    # Save to data folder
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, 'data', 'census.csv')
    
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    final_df.to_csv(out_path, index=False)
    print("Successfully generated", out_path, "with", len(final_df), "counties.")
else:
    print("Failed to fetch data:", response.status_code, response.text)
