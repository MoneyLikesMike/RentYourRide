#!/usr/bin/env node
/**
 * Upload / update Pinpoint email templates from apps/api/email-templates.
 *
 *   AWS_PROFILE=dev AWS_REGION=us-east-2 PINPOINT_APP_ID=... \
 *     node scripts/sync-pinpoint-templates.mjs
 *
 * Optional: pass template names to sync only those entries.
 *   node scripts/sync-pinpoint-templates.mjs YourTripExtensionRequestWasDenied
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  PinpointClient,
  CreateEmailTemplateCommand,
  UpdateEmailTemplateCommand,
  GetEmailTemplateCommand,
} = require('@aws-sdk/client-pinpoint');

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesRoot = join(__dirname, '..', 'email-templates');
const manifest = JSON.parse(
  readFileSync(join(templatesRoot, 'templates.json'), 'utf8'),
);

const region = process.env.AWS_REGION || process.env.PINPOINT_REGION || 'us-east-2';
const appId = process.env.PINPOINT_APP_ID || process.env.AWS_PINPOINT_APP_ID;
const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith('-')));

if (!appId) {
  console.error('Set PINPOINT_APP_ID (or AWS_PINPOINT_APP_ID).');
  process.exit(1);
}

const client = new PinpointClient({ region });

async function templateExists(name) {
  try {
    await client.send(
      new GetEmailTemplateCommand({ TemplateName: name }),
    );
    return true;
  } catch (err) {
    if (err?.name === 'NotFoundException') return false;
    throw err;
  }
}

async function syncOne(entry) {
  const htmlPart = readFileSync(join(templatesRoot, entry.htmlFile), 'utf8');
  const payload = {
    EmailTemplateRequest: {
      Subject: entry.subject,
      HtmlPart: htmlPart,
      TextPart: entry.textPart,
    },
  };

  if (await templateExists(entry.name)) {
    await client.send(
      new UpdateEmailTemplateCommand({
        TemplateName: entry.name,
        ...payload,
      }),
    );
    console.log(`Updated ${entry.name}`);
  } else {
    await client.send(
      new CreateEmailTemplateCommand({
        TemplateName: entry.name,
        ...payload,
      }),
    );
    console.log(`Created ${entry.name}`);
  }
}

const selected = manifest.filter(
  (entry) => only.size === 0 || only.has(entry.name),
);

if (selected.length === 0) {
  console.error('No templates matched.');
  process.exit(1);
}

for (const entry of selected) {
  await syncOne(entry);
}

console.log(`Done — synced ${selected.length} template(s) to Pinpoint (${region}).`);
