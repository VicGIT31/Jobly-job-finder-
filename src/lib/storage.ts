import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";

/** Abstraction du stockage fichiers (S3 en prod, MinIO en dev). */
export interface FileStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
  read?(key: string): Promise<Buffer>;
}

class S3FileStorage implements FileStorage {
  private client: S3Client;
  private bucket: string;
  private publicClient: S3Client;

  constructor() {
    this.bucket = process.env.S3_BUCKET_CV ?? "nextstep-cv";
    const config: S3ClientConfig = {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: true, // requis pour MinIO
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
      },
    };
    this.client = new S3Client(config);
    this.publicClient = process.env.S3_PUBLIC_ENDPOINT
      ? new S3Client({ ...config, endpoint: process.env.S3_PUBLIC_ENDPOINT })
      : this.client;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return getSignedUrl(this.publicClient, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export class LocalFileStorage implements FileStorage {
  constructor(private root: string) {}
  private path(key: string) {
    const root = resolve(this.root);
    const target = resolve(root, key);
    if (!target.startsWith(root + sep)) throw new Error("Chemin de fichier invalide");
    return target;
  }
  async put(key: string, body: Buffer) {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body, { mode: 0o600 });
  }
  async getSignedUrl() { return "/api/cv?download=1"; }
  async read(key: string) { return readFile(this.path(key)); }
  async delete(key: string) { await unlink(this.path(key)).catch((error) => { if (error.code !== "ENOENT") throw error; }); }
}

let storage: FileStorage | undefined;

export function getStorage(): FileStorage {
  if (!storage) storage = process.env.JOBLY_DESKTOP === "1"
    ? new LocalFileStorage(process.env.JOBLY_FILES_DIR!) : new S3FileStorage();
  return storage;
}
