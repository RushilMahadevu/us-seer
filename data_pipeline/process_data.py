"""
process_data.py
---------------
Merges federal datasets into a single county-level JSON file
for the Next.js geospatial dashboard.
"""

import pandas as pd
import numpy as np
import os

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_IN     = os.path.join(SCRIPT_DIR, 'data')
DATA_OUT    = os.path.join(SCRIPT_DIR, '..', 'public', 'data')

CDC_PATH    = os.path.join(DATA_IN, 'cdc_wonder.csv')
PM25_PATH   = os.path.join(DATA_IN, 'epa_pm2.5.csv')
CENSUS_PATH = os.path.join(DATA_IN, 'census.csv')
PLACES_PATH = os.path.join(DATA_IN, 'cdc_places.csv')
RUCC_PATH   = os.path.join(DATA_IN, 'usda_rucc.csv')
AHRF_PATH   = os.path.join(DATA_IN, 'hhs-ahrf.csv')
TRI_PATH    = os.path.join(DATA_IN, 'epa_tri.csv')
OUT_PATH    = os.path.join(DATA_OUT, 'county_data.json')

SUPPRESS_FLAGS = ['Suppressed', 'Missing', 'Unreliable', 'Not Available']

STATE_MAP = {
    'Alabama': '01', 'Alaska': '02', 'Arizona': '04', 'Arkansas': '05', 'California': '06',
    'Colorado': '08', 'Connecticut': '09', 'Delaware': '10', 'District of Columbia': '11',
    'Florida': '12', 'Georgia': '13', 'Hawaii': '15', 'Idaho': '16', 'Illinois': '17',
    'Indiana': '18', 'Iowa': '19', 'Kansas': '20', 'Kentucky': '21', 'Louisiana': '22',
    'Maine': '23', 'Maryland': '24', 'Massachusetts': '25', 'Michigan': '26', 'Minnesota': '27',
    'Mississippi': '28', 'Missouri': '29', 'Montana': '30', 'Nebraska': '31', 'Nevada': '32',
    'New Hampshire': '33', 'New Jersey': '34', 'New Mexico': '35', 'New York': '36',
    'North Carolina': '37', 'North Dakota': '38', 'Ohio': '39', 'Oklahoma': '40', 'Oregon': '41',
    'Pennsylvania': '42', 'Rhode Island': '44', 'South Carolina': '45', 'South Dakota': '46',
    'Tennessee': '47', 'Texas': '48', 'Utah': '49', 'Vermont': '50', 'Virginia': '51',
    'Washington': '53', 'West Virginia': '54', 'Wisconsin': '55', 'Wyoming': '56'
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def to_numeric(series):
    return pd.to_numeric(series.replace(SUPPRESS_FLAGS, np.nan), errors='coerce')

# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------
def load_cdc(path):
    print("1/7  Loading CDC WONDER...")
    df = pd.read_csv(path)
    df = df[pd.to_numeric(df['County Code'], errors='coerce').notna()].copy()
    df['FIPS']         = df['County Code'].astype(int).astype(str).str.zfill(5)
    df['mortalityRate'] = to_numeric(df['Crude Rate'])
    df['deaths']        = to_numeric(df['Deaths'])
    return df[['FIPS', 'mortalityRate', 'deaths']]

def load_pm25(path):
    print("2/7  Loading EPA PM2.5...")
    if not os.path.exists(path):
        path = path.replace('epa_pm2.5.csv', 'pm25.csv') # fallback just in case
    df = pd.read_csv(path, usecols=['year', 'statefips', 'countyfips', 'pm25_mean_pred'], dtype={'statefips': str, 'countyfips': str})
    df = df[df['year'].between(2018, 2022)].copy()
    df['FIPS'] = df['statefips'].str.zfill(2) + df['countyfips'].str.zfill(3)
    df['pm25_mean_pred'] = pd.to_numeric(df['pm25_mean_pred'], errors='coerce')
    agg = df.groupby('FIPS')['pm25_mean_pred'].mean().reset_index()
    agg = agg.rename(columns={'pm25_mean_pred': 'pm25Avg'})
    agg['pm25Avg'] = agg['pm25Avg'].round(2)
    return agg

def load_census(path):
    print("3/7  Loading Census ACS...")
    df = pd.read_csv(path, dtype={'FIPS': str})
    df['FIPS'] = df['FIPS'].str.zfill(5)
    df = df.rename(columns={
        'Population': 'population',
        'Median_Income': 'medianIncome',
        'Pct_Poverty': 'pctPoverty',
        'Pct_Uninsured': 'pctUninsured',
        'Pct_Black': 'pctBlack',
        'Pct_Hispanic': 'pctHispanic',
        'Median_Age': 'medianAge',
        'Pct_No_HS': 'pctNoHS',
        'Housing_Pre1940': 'housingPre1940',
    })
    numeric_cols = [
        'population', 'medianIncome', 'pctPoverty', 'pctUninsured',
        'pctBlack', 'pctHispanic', 'medianAge', 'pctNoHS', 'housingPre1940'
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    cols_to_keep = ['FIPS', 'County_Name'] + [c for c in numeric_cols if c in df.columns]
    return df[cols_to_keep]

def load_places(path):
    print("4/7  Loading CDC PLACES...")
    if not os.path.exists(path):
        path = path.replace('cdc_places.csv', 'COPD_asthma_smoking.csv')
    df = pd.read_csv(path, dtype={'CountyFIPS': str})
    df['FIPS'] = df['CountyFIPS'].str.zfill(5)
    df['asthmaPrev'] = pd.to_numeric(df['CASTHMA_CrudePrev'], errors='coerce')
    df['copdPrev'] = pd.to_numeric(df['COPD_CrudePrev'], errors='coerce')
    df['smokingPrev'] = pd.to_numeric(df['CSMOKING_CrudePrev'], errors='coerce')
    agg = df.groupby('FIPS')[['asthmaPrev', 'copdPrev', 'smokingPrev']].mean().reset_index()
    agg['asthmaPrev'] = agg['asthmaPrev'].round(2)
    agg['copdPrev'] = agg['copdPrev'].round(2)
    agg['smokingPrev'] = agg['smokingPrev'].round(2)
    return agg[['FIPS', 'asthmaPrev', 'copdPrev', 'smokingPrev']]

def load_rucc(path):
    print("5/7  Loading USDA RUCC...")
    df = pd.read_csv(path, encoding='latin1')
    df = df[df['Attribute'] == 'RUCC_2023'].copy()
    df['FIPS'] = df['FIPS'].astype(str).str.zfill(5)
    df['rucc'] = pd.to_numeric(df['Value'], errors='coerce')
    return df[['FIPS', 'rucc']]

def load_ahrf(path):
    print("6/7  Loading HHS AHRF...")
    df = pd.read_csv(path, skiprows=3)
    df['stateFips'] = df['State/Territory'].map(STATE_MAP)
    df['mdRate'] = pd.to_numeric(df['Rate (per 100,000 population)'], errors='coerce')
    return df[['stateFips', 'mdRate']]

def load_tri(path):
    print("7/7  Loading EPA TRI...")
    df = pd.read_csv(path, dtype={'FIPS': str})
    df['FIPS'] = df['FIPS'].str.zfill(5)
    df['toxicReleases'] = pd.to_numeric(df['toxicReleases'], errors='coerce')
    return df[['FIPS', 'toxicReleases']]

# ---------------------------------------------------------------------------
# Step 5: Merge and export
# ---------------------------------------------------------------------------
def merge_and_export(cdc, pm25, census, places, rucc, ahrf, tri):
    print("     Merging datasets...")

    census['stateFips'] = census['FIPS'].str[:2]

    merged = census.merge(cdc,  on='FIPS', how='left') \
                   .merge(pm25, on='FIPS', how='left') \
                   .merge(places, on='FIPS', how='left') \
                   .merge(rucc, on='FIPS', how='left') \
                   .merge(tri, on='FIPS', how='left') \
                   .merge(ahrf, on='stateFips', how='left')

    merged = merged.drop(columns=['stateFips'])

    os.makedirs(DATA_OUT, exist_ok=True)
    merged.set_index('FIPS').to_json(OUT_PATH, orient='index')

    print(f"\n✓ Done! Exported {len(merged):,} counties to {OUT_PATH}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    cdc    = load_cdc(CDC_PATH)
    pm25   = load_pm25(PM25_PATH)
    census = load_census(CENSUS_PATH)
    places = load_places(PLACES_PATH)
    rucc   = load_rucc(RUCC_PATH)
    ahrf   = load_ahrf(AHRF_PATH)
    tri    = load_tri(TRI_PATH)
    
    merge_and_export(cdc, pm25, census, places, rucc, ahrf, tri)

if __name__ == '__main__':
    main()
