import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = this.configService.get<string>('SUPABASE_BUCKET') ?? 'aff-media';

    if (!url || !key) {
      this.logger.error('Supabase credentials are missing');
      throw new Error('Supabase credentials are missing');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Upload a file buffer to Supabase Storage and return a public URL.
   * Assumes the bucket is set to public. For private buckets, use signed URLs.
   */
  async uploadBuffer(params: {
    buffer: Buffer;
    contentType?: string;
    folder?: string;
    filename?: string;
  }): Promise<string> {
    const folder = params.folder ?? 'uploads';
    const name = params.filename ?? `${randomUUID()}`;
    const path = `${folder}/${name}`;

    const { error } = await this.supabase.storage.from(this.bucket).upload(path, params.buffer, {
      contentType: params.contentType ?? 'application/octet-stream',
      upsert: false,
    });

    if (error) {
      this.logger.error('Supabase upload failed', error);
      throw new InternalServerErrorException('Failed to upload file');
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
    if (!data?.publicUrl) {
      throw new InternalServerErrorException('Failed to generate file URL');
    }

    return data.publicUrl;
  }
}
