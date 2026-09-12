
const fs = require('fs');
let code = fs.readFileSync('src/pages/StopPage.tsx', 'utf-8');

// Fix checkMathMismatch function
code = code.replace(
  /const requiredSpeedKmh = \(adjustedDistM \/ 1000\) \/ \(arrival\.eta_minutes \/ 60\)/,
  \const effectiveMinutes = Math.max(2, arrival.eta_minutes)
  const requiredSpeedKmh = (adjustedDistM / 1000) / (effectiveMinutes / 60)\
);

// Remove defaultValues
code = code.replace(/\{ defaultValue: 'Fiziksel uyusmazlik' \}/g, '');
code = code.replace(/, \{ defaultValue: 'Fiziksel uyusmazlik' \}/g, '');
code = code.replace(/\{ defaultValue: 'Fiziksel uyusmazlik: Aracin uzakligina göre bu sürede gelmesi fiziksel olarak mümkün görünmüyor.' \}/g, '');
code = code.replace(/, \{ defaultValue: 'Fiziksel uyusmazlik: Aracin uzakligina göre bu sürede gelmesi fiziksel olarak mümkün görünmüyor.' \}/g, '');
code = code.replace(/, \{ defaultValue: 'Gecikmeli veri: Otobüsün GPS sinyali uzun süredir alinamiyor. Konum ve ETA güncel olmayabilir.' \}/g, '');

fs.writeFileSync('src/pages/StopPage.tsx', code);

