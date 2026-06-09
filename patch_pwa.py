import os

filepath = r"C:\Users\amdin\Desktop\iett-project\iett-pwa\src\pages\StopPage.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# We need to remove the entire RouteAnnouncement type, llRoutesAtStop, nnsFetcher, polledAnnouncements, and nnouncements variables.
import re

# Remove RouteAnnouncement and related code
content = re.sub(
    r"type RouteAnnouncement = Announcement & { route_code: string }.*?const announcements = polledAnnouncements \?\? \[\]",
    "",
    content,
    flags=re.DOTALL
)

# Also there must be a Duyurular accordion rendering nnouncements. We need to remove that.
# Let's search for nnouncements or Duyurular in the file.
# I will just write the updated file for the first part and see if it compiles.
with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated StopPage.tsx")
