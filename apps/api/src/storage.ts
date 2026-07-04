import { createReadStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { Readable } from 'node:stream'
import { env, useR2 } from './env'

export interface StoredObject {
  stream: Readable
  contentType: string
  size: number
}

export interface StorageDriver {
  readonly kind: 'local' | 'r2'
  put(key: string, body: Buffer, contentType: string): Promise<void>
  /** A URL the browser can GET the object from, or null when the API must stream it. */
  url(key: string, filename: string): Promise<string | null>
  /** Stream the object (used by the local driver's download proxy). */
  read(key: string): Promise<StoredObject | null>
  remove(key: string): Promise<void>
}

// ─── Local disk driver ───────────────────────────────────────────────────────
class LocalDriver implements StorageDriver {
  readonly kind = 'local' as const
  private root = resolve(env.STORAGE_LOCAL_DIR)

  private path(key: string): string {
    // Prevent path traversal; keys are app-generated but be defensive.
    const safe = key.replace(/\.\.(\/|\\|$)/g, '')
    return join(this.root, safe)
  }

  async put(key: string, body: Buffer): Promise<void> {
    const p = this.path(key)
    await mkdir(dirname(p), { recursive: true })
    await writeFile(p, body)
  }

  async url(): Promise<string | null> {
    return null // API streams it via /api/attachments/:id/download
  }

  async read(key: string): Promise<StoredObject | null> {
    const p = this.path(key)
    try {
      const s = await stat(p)
      return { stream: createReadStream(p), contentType: 'application/octet-stream', size: s.size }
    } catch {
      return null
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.path(key), { force: true })
  }
}

// ─── Cloudflare R2 driver (S3 API) ───────────────────────────────────────────
class R2Driver implements StorageDriver {
  readonly kind = 'r2' as const
  private client: any
  private S3: any
  private presigner: any

  private async ensure() {
    if (this.client) return
    const s3 = await import('@aws-sdk/client-s3')
    this.S3 = s3
    this.presigner = await import('@aws-sdk/s3-request-presigner')
    this.client = new s3.S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    })
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.ensure()
    await this.client.send(
      new this.S3.PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
  }

  async url(key: string, filename: string): Promise<string | null> {
    if (env.R2_PUBLIC_BASE_URL) return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
    await this.ensure()
    const cmd = new this.S3.GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(filename)}"`,
    })
    return this.presigner.getSignedUrl(this.client, cmd, { expiresIn: 3600 })
  }

  async read(key: string): Promise<StoredObject | null> {
    await this.ensure()
    try {
      const res = await this.client.send(
        new this.S3.GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
      )
      return {
        stream: res.Body as Readable,
        contentType: res.ContentType ?? 'application/octet-stream',
        size: Number(res.ContentLength ?? 0),
      }
    } catch {
      return null
    }
  }

  async remove(key: string): Promise<void> {
    await this.ensure()
    await this.client.send(new this.S3.DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }))
  }
}

export const storage: StorageDriver = useR2 ? new R2Driver() : new LocalDriver()
