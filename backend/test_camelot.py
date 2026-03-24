import camelot
import pandas as pd
import json

file_path = r"d:\AI Agency\Cobra\LancelotMK2\Lista Ejemplo.pdf"

print("Extracting with stream...")
tables_stream = camelot.read_pdf(file_path, pages='1', flavor='stream')
for i, t in enumerate(tables_stream):
    print(f"--- Table {i} (Stream) ---")
    print(t.df)

print("\nExtracting with lattice...")
tables_lattice = camelot.read_pdf(file_path, pages='1', flavor='lattice')
for i, t in enumerate(tables_lattice):
    print(f"--- Table {i} (Lattice) ---")
    print(t.df)
