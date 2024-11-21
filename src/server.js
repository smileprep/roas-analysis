const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000; // Use port 5000

app.use(bodyParser.json());

app.post('/update-default-data', (req, res) => {
  const { googleAdsData, levantaData } = req.body;

  const googleDataPath = path.join(__dirname, 'src/data/defaultGoogleData.js');
  const levantaDataPath = path.join(__dirname, 'src/data/defaultLevantaData.js');

  const googleDataContent = `export const defaultGoogleData = ${JSON.stringify(googleAdsData, null, 2)};`;
  const levantaDataContent = `export const defaultLevantaData = ${JSON.stringify(levantaData, null, 2)};`;

  fs.writeFileSync(googleDataPath, googleDataContent);
  fs.writeFileSync(levantaDataPath, levantaDataContent);

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/update-default-data', (req, res) => {
  const { googleAdsData, levantaData } = req.body;

  const googleDataPath = path.join(__dirname, 'src/data/defaultGoogleData.js');
  const levantaDataPath = path.join(__dirname, 'src/data/defaultLevantaData.js');

  const googleDataContent = `export const defaultGoogleData = ${JSON.stringify(googleAdsData, null, 2)};`;
  const levantaDataContent = `export const defaultLevantaData = ${JSON.stringify(levantaData, null, 2)};`;

  fs.writeFileSync(googleDataPath, googleDataContent);
  fs.writeFileSync(levantaDataPath, levantaDataContent);

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});