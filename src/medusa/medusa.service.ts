import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Medusa from '@medusajs/js-sdk';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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

  private getStoreClient(key: string) {
    return (
      this.storeClient ??
      new Medusa({
        baseUrl: this.storeApi,
        debug: false,
        publishableKey: key,
      })
    );
  }

  private async storeLogin(email: string, password: string, key: string, actor_type: string) {
    const client = this.getStoreClient(key);
    // SDK login for store customers
    const token = await client.auth.login(actor_type, "emailpass", {
      email,
      password
    })
    return token;
  }

  private async storeRegister(email: string, password: string, key: string) {
    const client = this.getStoreClient(key);
    const token = await client.auth.register("customer", "emailpass", { email, password });
    return token
  }

  private async storeUserCreate(customerPayload: any, key: string, token: string) {
    const client = this.getStoreClient(key);
    const { customer } = await client.store.customer.create(
      customerPayload,
      {},
      { Authorization: `Bearer ${token}` }
    )

    return customer
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

    const client = this.getStoreClient(key);
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
      const products = res.products.map((product) => {
        return {
          id: product.id,
          thumbnail: product.thumbnail,
          title: product.title,
          price: product.variants[0]?.calculated_price?.original_amount || 2000,
        }
      })
      return { products, count: res.count, offset: res.offset, limit: res.limit };
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
    const client = this.getStoreClient(key);
    try {
      const res = await client.store.product.retrieve(productId, {
        fields: `+variants.inventory_quantity`,
        region_id: this.config.get<string>('MEDUSA_REGION_ID'),
      });
      const product_vendorUrl = `${this.storeApi}/store/product`
      const productVendor = await firstValueFrom(this.http.get(product_vendorUrl, {
        headers: { 'x-publishable-api-key': this.publishableKey ?? '' },
      }));
      const vendor = productVendor.data
      return {
        ...res,
        vendor
      };
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
      const params: Record<string, any> = { skip: offset, take };
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
      const products = res.data.map((product) => {
        return {
          id: product.id,
          thumbnail: product.thumbnail,
          title: product.title,
          price: product.variants[0]?.prices[0]?.amount,
        }
      })
      return { products };
    } catch (err: any) {
      this.logger.error('Medusa listProducts failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  async createCustomerForUser(user: {
    id?: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    name?: string;
    customer_id?: string | null;
    vendor_id?: string | null;
  }) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (!user?.email) throw new Error('email is required');

    if (user.customer_id) {
      return { message: 'Customer already exists', customer_id: user.customer_id };
    }

    const key = this.publishableKey;
    const email = user.email;
    const password = user.email; // per requirement
    const loginUrl = `${this.storeApi}/store/auth/login`;
    const registerUrl = `${this.storeApi}/store/auth/register`;
    const customersUrl = `${this.storeApi}/store/customers`;
    const headers = { 'x-publishable-api-key': key };

    try {
      let token: string | undefined;
      if (!user.vendor_id) {
        try {
          token = await this.storeRegister(email, password, key);
        } catch (e) {
          this.logger.warn('Medusa register failed, attempting login', e?.response?.data ?? e?.message ?? e);
        }
      }
      if (!token) {
        token = (await this.storeLogin(email, password, key, "customer")) as string;
      }

      if (!token) throw new Error('Medusa auth token not returned');

      const customerPayload = {
        email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone_number,
        company_name: user.name,
      };

      const newMedusaCustomer = await this.storeUserCreate(customerPayload, this.publishableKey, token);

      if (newMedusaCustomer?.id && user.id) {
        try {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { customer_id: newMedusaCustomer.id },
          });
        } catch (updateErr: any) {
          this.logger.error(
            'Failed to persist customer_id locally after Medusa create',
            updateErr?.response?.data ?? updateErr?.message ?? updateErr,
          );
          return { ...newMedusaCustomer, savedLocally: false };
        }
      }

      return newMedusaCustomer;
    } catch (err: any) {
      this.logger.error('Medusa createCustomerForUser failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  async createVendorForUser(user: {
    id: string;
    email: string;
    customer_id?: string;
    vendor_id?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    avatar_url?: string;
  }, logo_url: string, handle: string) {

    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (user.vendor_id) {
      return { message: 'Vendor already exists', vendor_id: user.vendor_id };
    }
    if (!user?.email) throw new Error('User email is required to create a vendor');
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');



    const registerUrl = `${this.storeApi}/auth/vendor/emailpass/register`;
    const vendorsUrl = `${this.storeApi}/vendors`;
    const password = user.email; // per requirement
    const email = user.email;
    const key = this.publishableKey

    let token: string | undefined;
    if (!user.customer_id) {
      const registerPayload = {
        email,
        password,
      };
      try {
        const registerRes = await firstValueFrom(this.http.post(registerUrl, registerPayload, {
          headers: { 'x-publishable-api-key': this.publishableKey ?? '' },
        }));
        const token = registerRes.data?.token || registerRes.data?.access_token;
      } catch (e) {
        this.logger.warn('Medusa register failed, attempting login', e?.response?.data ?? e?.message ?? e);
      }
    }
    if (!token) {
      token = (await this.storeLogin(email, password, key, "vendor")) as string;
    }

    if (!token) throw new Error('Medusa auth token not returned');

    try {
      const defaultVendorLogo = 'https://ehdequyzbusoegqogznj.supabase.co/storage/v1/object/public/AFF%20Bucket/public/AFF%20Shopping%20bag.jpg'
      const vendorPayload = {
        name: user.name ?? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
        handle: handle || user.name,
        logo: logo_url || user.avatar_url || defaultVendorLogo,
        admin: {
          email: user.email,
          first_name: user.first_name ?? user.name ?? '',
          last_name: user.last_name ?? '',
        },
      };

      const newMedusaVendor = await firstValueFrom(
        this.http.post(vendorsUrl, vendorPayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-publishable-api-key': this.publishableKey ?? '',
          },
        }),
      );

      if (newMedusaVendor?.data?.vendor.id && user.email) {
        try {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { vendor_id: newMedusaVendor?.data?.vendor.id },
          });
        } catch (updateErr: any) {
          this.logger.error(
            'Failed to persist customer_id locally after Medusa create',
            updateErr?.response?.data ?? updateErr?.message ?? updateErr,
          );
          return { ...newMedusaVendor, savedLocally: false };
        }
      }

      return newMedusaVendor.data;
    } catch (err: any) {
      this.logger.error('Medusa createVendorForUser failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }
}
