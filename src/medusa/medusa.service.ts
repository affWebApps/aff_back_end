import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Medusa from '@medusajs/js-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { StoreCart } from '@medusajs/types';

export interface MedusaListProductsParams {
  page?: number;
  limit?: number;
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

  private getStoreClient() {
    if (!this.publishableKey) {
      throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    }
    return (
      this.storeClient ??
      new Medusa({
        baseUrl: this.storeApi,
        debug: false,
        publishableKey: this.publishableKey,
      })
    );
  }

  private async storeLogin(email: string, password: string, actor_type: string) {
    const client = this.getStoreClient();
    // SDK login for store customers
    const token = await client.auth.login(actor_type, "emailpass", {
      email,
      password
    })
    return token;
  }

  private async storeRegister(email: string, password: string) {
    const client = this.getStoreClient();
    const token = await client.auth.register("customer", "emailpass", { email, password });
    return token
  }

  private async getCart(id: string) {
    const client = this.getStoreClient();
    const cart_response = await client.store.cart.retrieve(id, {
      fields: "items.id, items.title,items.quantity, items.product_id, items.variant_id, items.variant_title, items.thumbnail, items.unit_price, region_id, subtotal, total, shipping_total, shipping_subtotal, shipping_methods, shipping_address.*, billing_address.*, customer.*"
    })
    const cart = cart_response?.cart
    const item_count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0)
    return {
      cart,
      item_count
    }
  }
  private async getFullCart(id: string, key: string) {
    const client = this.getStoreClient();
    const cart_response = await client.store.cart.retrieve(id)
    const cart = cart_response?.cart
    const item_count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0)
    return {
      cart,
      item_count
    }
  }

  async loginStoreCustomer(email: string, password: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    return this.storeLogin(email, password, "customer");
  }

  async loginVendor(email: string, password: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    return this.storeLogin(email, password, "vendor");
  }

  private async storeUserCreate(customerPayload: any, key: string, token: string) {
    const client = this.getStoreClient();
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

    // if (!key) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');

    const client = this.getStoreClient();
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
      const pagination = { count: res.count, offset: res.offset, limit: res.limit }
      return { products, pagination };
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
    const client = this.getStoreClient();
    try {
      const res = await client.store.product.retrieve(productId, {
        fields: `+variants.inventory_quantity`,
        region_id: this.config.get<string>('MEDUSA_REGION_ID'),
      });
      const product_vendorUrl = `${this.storeApi}/store/product`;
      const productVendor = await firstValueFrom(
        this.http.get(product_vendorUrl, {
          params: { product_id: productId },
          headers: { 'x-publishable-api-key': this.publishableKey ?? '' },
        }),
      );
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

    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');

    const url = `${this.storeApi}/store/products-by-vendor`;
    try {
      const params: Record<string, any> = { offset, limit };
      if (salesChannelId) params.sales_channel_id = salesChannelId;
      if (typeId) params.type_id = typeId;
      if (collectionId) params.collection_id = collectionId;
      if (vendorId) params.vendor_id = vendorId;
      const res = await firstValueFrom(
        this.http.get(url, {
          params,
          headers: { 'x-publishable-api-key': this.publishableKey ?? '' },
        }),
      );
      const count = res.data.count
      const pagination = { count, offset, limit }
      const products = res.data.products.map((product) => {
        return {
          id: product.id,
          thumbnail: product.thumbnail,
          title: product.title,
          price: product.variants[0]?.prices[0]?.amount,
          status: product.status,
          created_at: product.created_at
        }
      })
      return { products, pagination };
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
          token = await this.storeRegister(email, password);
        } catch (e) {
          this.logger.warn('Medusa register failed, attempting login', e?.response?.data ?? e?.message ?? e);
        }
      }
      if (!token) {
        token = (await this.storeLogin(email, password, "customer")) as string;
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

  /**
   * Lightweight path used during sign-in/sign-up:
   * 1) POST /auth/user/my-auth with x-aff-token (our JWT)
   * 2) POST /vendors with same header to create vendor & customer
   * 3) Persist ids to our user record
   */
  async syncVendorAndCustomerWithAffToken(userId: string, affToken: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');

    const headers = {
      'x-publishable-api-key': this.publishableKey,
      'x-aff-token': affToken,
    };

    // We need user details to build vendor payload
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found for Medusa sync');

    // Skip if already synced to avoid extra upstream calls
    if (user.vendor_id && user.customer_id) {
      return {
        message: 'Medusa sync skipped; IDs already present',
        vendor_id: user.vendor_id,
        customer_id: user.customer_id,
      };
    }

    // Attempt to fetch auth-context which may already include customer/vendor ids
    try {
      const contextRes = await firstValueFrom(
        this.http.get(
          `${this.storeApi}/store/auth-context`,
          { headers },
        ),
      );
      const resVendorId = contextRes.data?.vendor_id;
      const resCustomerId = contextRes.data?.customer_id;
      console.log("response from new implementation", contextRes.data)
      if ((resVendorId || resCustomerId) && userId) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            vendor_id: resVendorId ?? undefined,
            customer_id: resCustomerId ?? undefined,
          },
        });
        return {
          message: 'Medusa sync satisfied from auth-context',
          vendor_id: resVendorId,
          customer_id: resCustomerId,
        };
      }
    } catch (e: any) {
      this.logger.warn('auth-context check failed, continuing to create', e?.response?.data ?? e?.message ?? e);
    }

    const defaultVendorLogo =
      'https://ehdequyzbusoegqogznj.supabase.co/storage/v1/object/public/AFF%20Bucket/public/AFF%20Shopping%20bag.jpg';
    const handle = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    const vendorPayload = {
      name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email,
      handle,
      logo: user.avatar_url || defaultVendorLogo,
      admin: {
        email: user.email,
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
      },
    };

    try {
      // Authenticate with medusa using our token
      await firstValueFrom(
        this.http.post(`${this.storeApi}/auth/user/my-auth`, {}, { headers }),
      );

      // Create vendor (and customer) via combined endpoint with payload
      const vendorRes = await firstValueFrom(
        this.http.post(`${this.storeApi}/vendors`, vendorPayload, { headers }),
      );

      const vendorAdminId = vendorRes.data?.vendor?.admins[0]?.id;
      const customerId = vendorRes.data?.customer?.id;

      if (userId && (vendorAdminId || customerId)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            vendor_id: vendorAdminId ?? undefined,
            customer_id: customerId ?? undefined,
          },
        });
      }

      return vendorRes.data;
    } catch (err: any) {
      this.logger.error('Medusa syncVendorAndCustomerWithAffToken failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Proxy to Medusa /vendors/products with x-aff-token header.
   */
  async createVendorProducts(affToken: string, payload: any) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!affToken) throw new Error('affToken is required');

    const headers = {
      'x-aff-token': affToken,
      ...(this.publishableKey ? { 'x-publishable-api-key': this.publishableKey } : {}),
    };

    try {
      const res = await firstValueFrom(
        this.http.post(`${this.storeApi}/vendors/products`, payload, { headers }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error('Medusa createVendorProducts failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Add a line item to the current user's cart, creating/retrieving the cart first.
   */
  async addToCart(affToken: string, variantId: string, quantity: number, cartId?: string, productId?: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (!affToken) throw new Error('affToken is required');
    if (!variantId) throw new Error('variantId is required');
    const qty = Number(quantity) || 1;
    if (qty <= 0) throw new Error('quantity must be greater than 0');

    if (!productId) {
      throw new Error('productId is required to validate stock before adding to cart');
    }

    let resolvedCartId = cartId?.trim();
    if (!resolvedCartId) {
      const cart = await this.ensureCartForUser(affToken);
      resolvedCartId = cart?.cart?.id;
    }

    if (!resolvedCartId) {
      throw new Error('Unable to obtain cart_id from Medusa');
    }

    const client = this.getStoreClient();
    try {
      const productRes = await client.store.product.retrieve(productId, {
        fields: '*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory',
      });
      const variant = productRes.product?.variants?.find((v: any) => v.id === variantId);
      if (!variant) throw new Error('Variant not found for product');
      const manageInventory = variant.manage_inventory ?? true;
      const availableQty = variant.inventory_quantity ?? 0;
      if (manageInventory && availableQty < qty) {
        throw new Error('Insufficient stock for this variant');
      }

      const updated = await client.store.cart.createLineItem(resolvedCartId, {
        variant_id: variantId,
        quantity: qty,
      });
      const item_count = updated.cart?.items?.reduce((sum, item) => sum + item.quantity, 0);
      return { cart: updated.cart, item_count };
    } catch (err: any) {
      this.logger.error('Medusa addToCart failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Remove a line item from a cart.
   */
  async removeFromCart(affToken: string, itemId: string, cartId?: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (!affToken) throw new Error('affToken is required');
    if (!itemId) throw new Error('itemId is required');

    let resolvedCartId = cartId?.trim();
    if (!resolvedCartId) {
      const cart = await this.ensureCartForUser(affToken);
      resolvedCartId = cart?.cart?.id
    }
    if (!resolvedCartId) {
      throw new Error('Unable to obtain cart_id from Medusa');
    }

    const client = this.getStoreClient();
    try {
      const updated = await client.store.cart.deleteLineItem(resolvedCartId, itemId);
      const cart = updated.parent
      const item_count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0);
      return { cart, item_count };
    } catch (err: any) {
      this.logger.error('Medusa removeFromCart failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Update quantity of a line item in a cart.
   */
  async updateCartItem(affToken: string, itemId: string, quantity: number, cartId?: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (!affToken) throw new Error('affToken is required');
    if (!itemId) throw new Error('itemId is required');
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('quantity must be greater than 0');

    let resolvedCartId = cartId?.trim();
    if (!resolvedCartId) {
      const cart = await this.ensureCartForUser(affToken);
      resolvedCartId = cart?.cart?.id
    }
    if (!resolvedCartId) {
      throw new Error('Unable to obtain cart_id from Medusa');
    }

    const client = this.getStoreClient();
    try {
      const updated = await client.store.cart.updateLineItem(resolvedCartId, itemId, {
        quantity: qty,
      });
      const cart = updated.cart;
      const item_count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0);
      return { cart, item_count };
    } catch (err: any) {
      this.logger.error('Medusa updateCartItem failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Update cart details (email, shipping & billing addresses).
   */
  async updateCartDetails(
    affToken: string,
    updates: { email?: string; shipping_address?: any; billing_address?: any },
    cartId?: string,
  ) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (!affToken) throw new Error('affToken is required');
    let resolvedCartId = cartId?.trim();
    if (!resolvedCartId) {
      const cart = await this.ensureCartForUser(affToken);
      resolvedCartId = cart?.cart?.id
    }
    if (!resolvedCartId) throw new Error('Unable to obtain cart_id from Medusa');

    const client = this.getStoreClient();
    try {
      const updated = await client.store.cart.update(resolvedCartId, updates);
      const cart = updated.cart
      const item_count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0);
      return { cart, item_count };
    } catch (err: any) {
      this.logger.error('Medusa updateCartDetails failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Add a shipping method to a cart.
   */
  async addShippingMethodToCart(affToken: string, optionId: string, cartId?: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (!affToken) throw new Error('affToken is required');
    if (!optionId) throw new Error('option_id is required');

    let resolvedCartId = cartId?.trim();
    if (!resolvedCartId) {
      const cart = await this.ensureCartForUser(affToken);
      resolvedCartId = cart?.cart?.id
    }
    if (!resolvedCartId) throw new Error('Unable to obtain cart_id from Medusa');

    const client = this.getStoreClient();
    try {
      const updated = await client.store.cart.addShippingMethod(resolvedCartId, {
        option_id: optionId,
      });
      const cart = updated.cart;
      const item_count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0);
      return { cart, item_count };
    } catch (err: any) {
      this.logger.error('Medusa addShippingMethodToCart failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Create payment sessions and select provider for cart.
   */
  async initiatePaymentSession(
    affToken: string,
    providerId: string,
    email: string,
    cartId?: string,
  ) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (!affToken) throw new Error('affToken is required');
    if (!providerId) throw new Error('provider_id is required');

    let cartObj: StoreCart
    if (cartId?.trim()) {
      const fetched = await this.getCart(cartId.trim());
      cartObj = fetched.cart
    } else {
      const ensured = await this.ensureCartForUser(affToken);
      cartObj = ensured.cart;
    }
    if (!cartObj?.id) throw new Error('Unable to obtain cart_id from Medusa');

    const client = this.getStoreClient();
    const headers: Record<string, string> = { 'x-aff-token': affToken };
    if (this.publishableKey) headers['x-publishable-api-key'] = this.publishableKey;

    try {
      const resp = await client.store.payment.initiatePaymentSession(
        cartObj,
        {
          provider_id: providerId,
          data: {
            email,
          }
        },
        undefined,
        headers,
      );
      return resp;
    } catch (err: any) {
      this.logger.error('Medusa initiatePaymentSession failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Complete cart -> order.
   */
  async completeCart(affToken: string, cartId?: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (!affToken) throw new Error('affToken is required');

    let resolvedCartId = cartId?.trim();
    if (!resolvedCartId) {
      const cart = await this.ensureCartForUser(affToken);
      resolvedCartId = cart?.cart?.id
    }
    if (!resolvedCartId) throw new Error('Unable to obtain cart_id from Medusa');

    const client = this.getStoreClient();
    try {
      const result = await client.store.cart.complete(resolvedCartId);
      return result;
    } catch (err: any) {
      this.logger.error('Medusa completeCart failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Retrieve all orders
   */
  async getOrdersList() {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    const client = this.getStoreClient();
    try {
      const orders = await client.store.order.list()
      return orders
    } catch (err) {
      this.logger.error('Medusa retrieveOrder failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Retrieve order by id.
   */
  async retrieveOrder(orderId: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (!orderId) throw new Error('orderId is required');
    const client = this.getStoreClient();
    try {
      const res = await client.store.order.retrieve(orderId);
      return res;
    } catch (err: any) {
      this.logger.error('Medusa retrieveOrder failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Verify Paystack payment status via Medusa custom endpoint.
   */
  async verifyPaystackPayment(reference: string, affToken?: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!reference) throw new Error('reference is required');

    const headers: Record<string, string> = {};
    if (this.publishableKey) headers['x-publishable-api-key'] = this.publishableKey;
    if (affToken) headers['x-aff-token'] = affToken;

    try {
      const res = await firstValueFrom(
        this.http.get(`${this.storeApi}/store/paystack-verify`, { params: { reference }, headers }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error('Medusa verifyPaystackPayment failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * List available payment providers (optionally filtered by region).
   */
  async listPaymentProviders(regionId?: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    const client = this.getStoreClient();
    try {
      return await client.store.payment.listPaymentProviders(
        regionId ? { region_id: regionId } : undefined,
      );
    } catch (err: any) {
      this.logger.error('Medusa listPaymentProviders failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * List fulfillment/shipping options for a cart.
   */
  async listCartOptions(cartId: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!this.publishableKey) throw new Error('Missing MEDUSA_PUBLISHABLE_API_KEY');
    if (!cartId) throw new Error('cart_id is required');
    const client = this.getStoreClient();
    try {
      return await client.store.fulfillment.listCartOptions({ cart_id: cartId });
    } catch (err: any) {
      this.logger.error('Medusa listCartOptions failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  /**
   * Ensure the user has an active cart in Medusa.
   * - If cart_id already stored locally, reuse it.
   * - Otherwise call Medusa GET /store/cart with x-aff-token to fetch/create,
   *   then persist cart_id on the user record.
   */
  async ensureCartForUser(affToken: string) {
    if (!this.storeApi) throw new Error('MEDUSA_STORE_API is not configured');
    if (!affToken) throw new Error('affToken is required');

    const headers: Record<string, string> = { 'x-aff-token': affToken };
    if (this.publishableKey) headers['x-publishable-api-key'] = this.publishableKey;

    try {
      const res = await firstValueFrom(
        this.http.get(`${this.storeApi}/store/cart`, { headers }),
      );
      const cartId = res.data?.cart?.id || res.data?.cart_id || res.data?.id;
      const cart = await this.getCart(cartId)

      return cart;
    } catch (err: any) {
      this.logger.error('Medusa ensureCartForUser failed', err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  async getFullCartForUser(cartId: string) {
    return await this.getFullCart(cartId, this.publishableKey)
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
      token = (await this.storeLogin(email, password, "vendor")) as string;
    }

    if (!token) throw new Error('Medusa auth token not returned');

    try {
      const defaultVendorLogo = 'https://ehdequyzbusoegqogznj.supabase.co/storage/v1/object/public/AFF%20Bucket/public/AFF%20Shopping%20bag.jpg'
      const vendorPayload = {
        name: user.name ?? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
        handle: handle || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
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
