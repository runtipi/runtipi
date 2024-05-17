import fs from 'fs';
import path from 'path';

const CROWDIN_PROJECT_ID = process.env.CROWDIN_PROJECT_ID;
const CROWDIN_API_TOKEN = process.env.CROWDIN_API_TOKEN;

const outputDir = path.join(__dirname, '..', 'translations');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

type TargetLanguage = {
  id: string;
  name: string;
};

const fetchTranslations = async (language: TargetLanguage) => {
  const url = `https://api.crowdin.com/api/v2/projects/${CROWDIN_PROJECT_ID}/translations/builds`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${CROWDIN_API_TOKEN}`,
    },
  });

  const data = await response.json();

  console.log('Data for language: ', data);

  throw new Error('Not implemented');

  // fs.writeFileSync(path.join(outputDir, `${locale}.json`), JSON.stringify(data, null, 2));
};

const fetchTargetLanguages = async () => {
  const url = `https://api.crowdin.com/api/v2/projects/${CROWDIN_PROJECT_ID}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${CROWDIN_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch target languages for project: ${response.statusText}`);
  }

  const { data } = await response.json();

  return data.targetLanguages as TargetLanguage[];
};

const run = async () => {
  try {
    const targetLanguages = await fetchTargetLanguages();

    for (const language of targetLanguages) {
      await fetchTranslations(language);
      console.log(`Fetched translations for ${language}`);
    }
  } catch (error) {
    console.error('Error fetching translations:', error);
    process.exit(1);
  }
};

run();
