import pandas as pd
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_IN = os.path.join(SCRIPT_DIR, 'data')

RUCC_PATH = os.path.join(DATA_IN, 'usda_rucc.csv')
TRI_PATH = os.path.join(DATA_IN, 'epa_tri.csv')
OUT_PATH = os.path.join(DATA_IN, 'epa_tri_clean.csv')

def clean_county(name):
    name = str(name).upper()
    for s in [' COUNTY', ' PARISH', ' BOROUGH', ' CENSUS AREA', ' MUNICIPALITY', ' CITY AND BOROUGH']:
        name = name.replace(s, '')
    return name.strip()

def main():
    print("1/2 Loading RUCC for crosswalk...")
    df_rucc = pd.read_csv(RUCC_PATH, encoding='latin1')
    df_rucc = df_rucc[df_rucc['Attribute'] == 'RUCC_2023'].copy()
    df_rucc['FIPS'] = df_rucc['FIPS'].astype(str).str.zfill(5)
    df_rucc['join_key'] = df_rucc['County_Name'].apply(clean_county) + '_' + df_rucc['State']

    print("2/2 Loading and aggregating TRI data...")
    df_tri = pd.read_csv(TRI_PATH, usecols=['7. COUNTY', '8. ST', '107. TOTAL RELEASES'])
    df_tri['join_key'] = df_tri['7. COUNTY'].astype(str).str.upper() + '_' + df_tri['8. ST'].astype(str).str.upper()
    
    agg = df_tri.groupby('join_key')['107. TOTAL RELEASES'].sum().reset_index()
    
    merged = agg.merge(df_rucc[['join_key', 'FIPS']], on='join_key', how='inner')
    merged = merged.rename(columns={'107. TOTAL RELEASES': 'toxicReleases'})
    
    merged[['FIPS', 'toxicReleases']].to_csv(OUT_PATH, index=False)
    
    print(f"✓ Done! Exported {len(merged)} counties to {OUT_PATH}")

if __name__ == '__main__':
    main()
