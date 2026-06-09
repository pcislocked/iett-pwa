import base64
with open('src/api/client.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = base64.b64decode("YFw/dmlhPSR7dmlhfWxg").decode("utf-8") # \?via=\ (wait, no, it's \?via=\ but inside the string literal it is just \?via=\ ... let's just replace the whole line)

line_target = base64.b64decode("ICAgICAgZ2V0PEFycml2YWxbXT4oYC92MS9zdG9wcy8ke2Rjb2RlfS9hcnJpdmFscyR7dmlhID8gXGA/dmlhPSR7dmlhfVxgIDogJyd9YCwgaW5pdCks").decode("utf-8")
line_replacement = base64.b64decode("ICAgICAgZ2V0PEFycml2YWxbXT4oYC92MS9zdG9wcy8ke2Rjb2RlfS9hcnJpdmFscyR7dmlhID8gYD92aWE9JHt2aWF9YCA6ICcnfWAsIGluaXQpLA==").decode("utf-8")

text = text.replace(line_target, line_replacement)

with open('src/api/client.ts', 'w', encoding='utf-8') as f:
    f.write(text)
