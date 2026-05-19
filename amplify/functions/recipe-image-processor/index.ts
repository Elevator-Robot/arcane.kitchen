import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { S3Event } from 'aws-lambda';
import { Jimp } from 'jimp';

const s3 = new S3Client({});

const RAW_PREFIX = 'recipe-images/raw/';
const OUTPUT_PREFIX = process.env.OUTPUT_PREFIX || 'recipe-images/processed/';
const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 900;

const streamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const toProcessedKey = (rawKey: string) => {
  const baseName = rawKey.slice(RAW_PREFIX.length).replace(/\.[a-zA-Z0-9]+$/, '');
  return `${OUTPUT_PREFIX}${baseName}.jpg`;
};

export const handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const rawKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    if (!rawKey.startsWith(RAW_PREFIX)) {
      continue;
    }

    const getObject = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: rawKey,
      })
    );

    if (!getObject.Body) {
      continue;
    }

    const buffer = await streamToBuffer(getObject.Body as NodeJS.ReadableStream);
    const image = await Jimp.fromBuffer(buffer);

    image.cover({ w: TARGET_WIDTH, h: TARGET_HEIGHT });
    image.contrast(0.08);
    image.color([{ apply: 'saturate', params: [8] }]);

    const outputBuffer = await image.getBuffer('image/jpeg', {
      quality: 85,
    });
    const processedKey = toProcessedKey(rawKey);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: processedKey,
        Body: outputBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  }
};
