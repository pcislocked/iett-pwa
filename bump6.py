import os

filepath = r"C:\Users\amdin\Desktop\iett-project\iett-pwa\package.json"
with open(filepath, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace('"version": "0.3.30"', '"version": "0.4.0"')

with open(filepath, "w", encoding="utf-8") as f:
    f.write(text)
