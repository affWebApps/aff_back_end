import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Medusa from '@medusajs/js-sdk';

export interface MedusaListProductsParams {
  page?: number;
  limit?: number;
  publishableKey?: string;
  typeId?: string;
  collectionId?: string;
  salesChannelId?: string;
}

@Injectable()
export class MedusaService {
  private readonly logger = new Logger(MedusaService.name);
  private readonly storeApi: string;
  private readonly publishableKey?: string;
  private readonly storeClient?: Medusa;

  constructor(private readonly http: HttpService, private readonly config: ConfigService) {
    this.storeApi = this.config.get<string>('MEDUSA_STORE_API') ?? '';
    this.publishableKey = this.config.get<string>('MEDUSA_PUBLISHABLE_API_KEY') ?? undefined;
    if (!this.storeApi) {
      this.logger.warn('MEDUSA_STORE_API is not set; Medusa endpoints will fail.');
    }
    if (this.storeApi && this.publishableKey) {
      this.storeClient = new Medusa({
        baseUrl: this.storeApi,
        debug: false,
        publishableKey: this.publishableKey,
      });
    }
  }

  async listProducts({
    page = 1,
    limit = 20,
    typeId,
    collectionId,
    salesChannelId,
  }: MedusaListProductsParams) {
    if (!this.storeApi) {
      throw new Error('MEDUSA_STORE_API is not configured');
    }
    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const pageNum = Math.max(1, Number(page) || 1);
    const offset = (pageNum - 1) * take;

    const key = this.publishableKey;
    if (!key) throw new Error('Missing x-publishable-api-key and MEDUSA_PUBLISHABLE_API_KEY');

    const client =
      this.storeClient ??
      new Medusa({
        baseUrl: this.storeApi,
        debug: false,
        publishableKey: key,
      });
    try {
      const res = await client.store.product.list({
        limit: take,
        offset,
        collection_id: collectionId,
        type_id: typeId,
        sales_channel_id: salesChannelId,
        fields: "id, thumbnail,title",
        region_id: this.config.get<string>('MEDUSA_REGION_ID'),
      });
      const product_results = res.products.map((product) => {
        return {
          id: product.id,
          thumbnail: product.thumbnail,
          title: product.title,
          price: product.variants[0].calculated_price.original_amount,
        }
      })
      return { product_results, count: res.count, offset: res.offset, limit: res.limit };
    } catch (err: any) {
      this.logger.error('Medusa listProducts failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  async getProductById(productId: string) {
    if (!productId) throw new Error('product_id is required');
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    const key = this.publishableKey;
    if (!key) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    const client =
      this.storeClient ??
      new Medusa({
        baseUrl: this.storeApi,
        debug: false,
        publishableKey: key,
      });
    try {
      const res = await client.store.product.retrieve(productId, {
        fields: `+variants.inventory_quantity`,
        region_id: this.config.get<string>('MEDUSA_REGION_ID'),
      });
      return res;
    } catch (err: any) {
      this.logger.error('Medusa getProductById failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }


  async listProductsbyVendor({
    page = 1,
    limit = 20,
    typeId,
    collectionId,
    salesChannelId,
    vendorId,
  }) {
    if (!this.storeApi) {
      throw new Error('MEDUSA_STORE_API is not configured');
    }
    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const pageNum = Math.max(1, Number(page) || 1);
    const offset = (pageNum - 1) * take;

    const key = this.publishableKey;
    if (!key) throw new Error('Missing x-publishable-api-key and MEDUSA_PUBLISHABLE_API_KEY');

    const url = `${this.storeApi}/store/products-by-vendor`;
    try {
      const params: Record<string, any> = { offset, limit: take };
      if (salesChannelId) params.sales_channel_id = salesChannelId;
      if (typeId) params.type_id = typeId;
      if (collectionId) params.collection_id = collectionId;
      if (vendorId) params.vendor_id = vendorId;
      const res = await firstValueFrom(
        this.http.get(url, {
          params,
          headers: { 'x-publishable-api-key': key },
        }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error('Medusa listProducts failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }
}
