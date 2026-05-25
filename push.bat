git checkout -b release/v0.4.0
git add src/
git commit -m "feat: release v0.4.0 with VariantSelect, BusDetailSheet and Sticky Routes"
git push -u origin release/v0.4.0
gh pr create --title "Release v0.4.0: VariantSelect and BusDetailSheet" --body "Includes complete route variant support, sticky headers, multi-probe amenity caching, and the new BusDetailSheet. Fixes z-index conflicts and provides dynamic footnotes."
