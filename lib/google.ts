import { google } from 'googleapis';
if (!drive) throw new Error('Not authenticated with Google');
const fileId = await ensureConfigFile();
const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
const chunks: Buffer[] = [];
await new Promise<void>((resolve, reject) => {
res.data.on('data', (d: Buffer) => chunks.push(d));
res.data.on('end', () => resolve());
res.data.on('error', reject);
});
const json = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
return { json, fileId } as const;
}


export async function writeConfigJSON(json: any) {
const drive = await driveClient();
if (!drive) throw new Error('Not authenticated with Google');
const { fileId } = await readConfigJSON();
await drive.files.update({
fileId,
media: { mimeType: 'application/json', body: JSON.stringify(json, null, 2) }
});
}


// Ensure nested folder path exists in order: Client / Campaign / Publication / Date
export async function ensureFolderPath({ clientName, campaignName, publicationName, dateFolder }: { clientName: string; campaignName: string; publicationName: string; dateFolder: string; }) {
const drive = await driveClient();
if (!drive) throw new Error('Not authenticated with Google');


async function findOrCreate(name: string, parentId?: string) {
const qParts = [
`name='${name.replace(/'/g, "\\'")}'`,
"mimeType='application/vnd.google-apps.folder'",
'trashed=false'
];
if (parentId) qParts.push(`'${parentId}' in parents`);
const q = qParts.join(' and ');
const res = await drive.files.list({ q, fields: 'files(id, name)' });
let id = res.data.files?.[0]?.id;
if (!id) {
const created = await drive.files.create({ requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined } });
id = created.data.id!;
}
return id!;
}


const clientId = await findOrCreate(clientName);
const campaignId = await findOrCreate(campaignName, clientId);
const publicationId = await findOrCreate(publicationName, campaignId);
const dateId = await findOrCreate(dateFolder, publicationId);
return dateId;
}


export async function uploadIntoPath(opts: { file: File; client: string; campaign: string; publication: string; dateFolder: string; }) {
const drive = await driveClient();
if (!drive) throw new Error('Not authenticated with Google');
const parentId = await ensureFolderPath({ clientName: opts.client, campaignName: opts.campaign, publicationName: opts.publication, dateFolder: opts.dateFolder });


const arrayBuf = await opts.file.arrayBuffer();
const buf = Buffer.from(arrayBuf);


const created = await drive.files.create({
requestBody: { name: opts.file.name, parents: [parentId] },
media: { mimeType: opts.file.type || 'application/octet-stream', body: buf }
});
return created.data;
}