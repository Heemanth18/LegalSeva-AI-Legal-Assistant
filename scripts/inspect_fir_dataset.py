import pandas as pd

df = pd.read_csv("datasets/FIR_DATASET.csv")

print("Rows:", len(df))
print("Columns:", df.columns)
print(df.head())