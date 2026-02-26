import { Controller, Get, Headers, Query, HttpException, Param, Post, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MedusaService, MedusaListProductsParams } from './medusa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Medusa Store')
@Controller({ path: 'store', version: '1' })
export class MedusaController {
  constructor(private readonly medusaService: MedusaService) { }

  @Get('products')
  @ApiOperation({ summary: 'List Medusa products with pagination' })
  async listProducts(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type_id') typeId?: string,
    @Query('collection_id') collectionId?: string,
    @Query('sales_channel_id') salesChannelId?: string,
    @Headers('x-publishable-api-key') publishableKey?: string,
  ) {
    try {
      return await this.medusaService.listProducts({
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        publishableKey,
        typeId,
        collectionId,
        salesChannelId,
      } as MedusaListProductsParams);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to fetch products from Medusa';
      // Use 502 Bad Gateway for upstream errors, 400 for bad input
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @Get('products-by-vendor')
  @ApiOperation({ summary: 'List Medusa products by vendor with pagination' })
  async listProductsByVendor(
    @Query('vendor_id') vendorId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type_id') typeId?: string,
    @Query('collection_id') collectionId?: string,
    @Query('sales_channel_id') salesChannelId?: string,
    @Headers('x-publishable-api-key') publishableKey?: string,
  ) {
    try {
      return await this.medusaService.listProductsbyVendor({
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        typeId,
        collectionId,
        salesChannelId,
        vendorId,
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to fetch vendor products from Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get Medusa product by id' })
  async getProductById(@Param('id') id: string) {
    try {
      return await this.medusaService.getProductById(id);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to fetch product from Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('cart')
  @ApiOperation({ summary: 'Ensure and return current user cart' })
  async ensureCart(@Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) {
      throw new HttpException({ status: 400, message: 'Missing Bearer token' }, 400);
    }
    try {
      return await this.medusaService.ensureCartForUser(token);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to ensure cart in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  @ApiOperation({ summary: 'Sync Medusa vendor & customer using current AFF token' })
  async syncVendorAndCustomer(@Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    console.log(token)
    if (!token) {
      throw new HttpException({ status: 400, message: 'Missing Bearer token' }, 400);
    }
    try {
      return await this.medusaService.syncVendorAndCustomerWithAffToken(req.user.id, token);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to sync vendor/customer in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('vendors/products')
  @ApiOperation({ summary: 'Create/Update vendor products via Medusa (proxies payload)' })
  async createVendorProducts(@Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) {
      throw new HttpException({ status: 400, message: 'Missing Bearer token' }, 400);
    }
    try {
      return await this.medusaService.createVendorProducts(token, req.body);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create vendor products in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart/add-to-cart')
  @ApiOperation({ summary: 'Add item to cart (uses provided cart_id or ensures one)' })
  async addToCart(@Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) {
      throw new HttpException({ status: 400, message: 'Missing Bearer token' }, 400);
    }

    const { variant_id, quantity, cart_id } = req.body ?? {};
    if (!variant_id) {
      throw new HttpException({ status: 400, message: 'variant_id is required' }, 400);
    }

    try {
      return await this.medusaService.addToCart(token, variant_id, quantity ?? 1, cart_id);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to add item to cart in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart/remove-item')
  @ApiOperation({ summary: 'Remove item from cart (uses provided cart_id or ensures one)' })
  async removeFromCart(@Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) {
      throw new HttpException({ status: 400, message: 'Missing Bearer token' }, 400);
    }

    const { item_id, cart_id } = req.body ?? {};
    if (!item_id) {
      throw new HttpException({ status: 400, message: 'item_id is required' }, 400);
    }

    try {
      return await this.medusaService.removeFromCart(token, item_id, cart_id);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to remove item from cart in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart/update-item')
  @ApiOperation({ summary: 'Update quantity of an item in cart (uses provided cart_id or ensures one)' })
  async updateCartItem(@Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) {
      throw new HttpException({ status: 400, message: 'Missing Bearer token' }, 400);
    }

    const { item_id, quantity, cart_id } = req.body ?? {};
    if (!item_id) {
      throw new HttpException({ status: 400, message: 'item_id is required' }, 400);
    }
    if (quantity === undefined || quantity === null) {
      throw new HttpException({ status: 400, message: 'quantity is required' }, 400);
    }

    try {
      return await this.medusaService.updateCartItem(token, item_id, quantity, cart_id);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update item in cart in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart/update')
  @ApiOperation({ summary: 'Update cart details (email, shipping, billing)' })
  async updateCart(@Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) throw new HttpException({ status: 400, message: 'Missing Bearer token' }, 400);

    const { email, shipping_address, billing_address, cart_id } = req.body ?? {};
    try {
      return await this.medusaService.updateCartDetails(token, { email, shipping_address, billing_address }, cart_id);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update cart in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart/shipping-method')
  @ApiOperation({ summary: 'Add shipping method to cart' })
  async addShippingMethod(@Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) throw new HttpException({ status: 400, message: 'Missing Bearer token' }, 400);

    const { option_id, cart_id } = req.body ?? {};
    if (!option_id) throw new HttpException({ status: 400, message: 'option_id is required' }, 400);

    try {
      return await this.medusaService.addShippingMethodToCart(token, option_id, cart_id);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to add shipping method in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart/payment-session')
  @ApiOperation({ summary: 'Initiate/select payment session for cart' })
  async initiatePaymentSession(@Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const email = req.user?.email
    if (!token) throw new HttpException({ status: 400, message: 'Missing Bearer token' }, 400);

    const { provider_id, cart_id } = req.body ?? {};
    if (!provider_id) throw new HttpException({ status: 400, message: 'provider_id is required' }, 400);

    try {
      return await this.medusaService.initiatePaymentSession(token, provider_id, cart_id, email);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to initiate payment session in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('cart/complete')
  @ApiOperation({ summary: 'Complete cart and place order' })
  async completeCart(@Req() req: any) {
    const authHeader: string | undefined = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) throw new HttpException({ status: 400, message: 'Missing Bearer token' }, 400);

    const { cart_id } = req.body ?? {};
    try {
      return await this.medusaService.completeCart(token, cart_id);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to complete cart in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id')
  @ApiOperation({ summary: 'Retrieve order by id' })
  async getOrder(@Param('id') id: string) {
    try {
      return await this.medusaService.retrieveOrder(id);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to retrieve order in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }


}
