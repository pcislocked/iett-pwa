import os

filepath = r"C:\Users\amdin\Desktop\iett-project\iett-pwa\package.json"
with open(filepath, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace('"version": "0.3.28.1"', '"version": "0.3.28.2"')

with open(filepath, "w", encoding="utf-8") as f:
    f.write(text)
