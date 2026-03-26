import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

export async function generatePresignedUploadUrl({
  bucket,
  key,
  ttl,
}: {
  bucket: string;
  key: string;
  ttl: number;
}) {
  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: ttl },
  );

  return { uploadUrl, storageKey: key };
}

export async function getR2Object(key: string): Promise<string | null> {
  try {
    const res = await r2.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    }));

    if (!res.Body) {
      return null;
    }

    return await res.Body.transformToString();
  } catch {
    return null;
  }
}
