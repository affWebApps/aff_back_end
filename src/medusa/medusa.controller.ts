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

  // @Get('products/vendor')
  // @ApiOperation({ summary: 'List Medusa products with pagination' })
  // async listProductsByVendor(
  //   @Query('page') page = '1',
  //   @Query('limit') limit = '20',
  //   @Query('type_id') typeId?: string,
  //   @Query('vendor_id') vendorId?: string,
  //   @Query('collection_id') collectionId?: string,
  //   @Query('sales_channel_id') salesChannelId?: string,
  //   @Headers('x-publishable-api-key') publishableKey?: string,
  // ) {
  //   console.log(collectionId)
  //   try {
  //     return await this.medusaService.listProductsbyVendor({
  //       page: Number(page) || 1,
  //       limit: Number(limit) || 20,
  //       publishableKey,
  //       typeId,
  //       collectionId,
  //       salesChannelId,
  //       vendorId
  //     });
  //   } catch (err: any) {
  //     const message =
  //       err?.response?.data?.message ||
  //       err?.message ||
  //       'Failed to fetch products from Medusa';
  //     // Use 502 Bad Gateway for upstream errors, 400 for bad input
  //     const status =
  //       err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
  //         ? err.response.status
  //         : 502;
  //     throw new HttpException({ status, message }, status);
  //   }
  // }

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
  @Post('vendors')
  @ApiOperation({ summary: 'Create Medusa vendor for the authenticated user' })
  async createVendor(@Req() req: any) {
    if (req.user.vendorId && req.user.vendorId.length > 0) {
      return { message: "Vendor already exists" }
    }
    try {
      return await this.medusaService.createVendorForUser(req.user, req.body.logo, req.body.handle);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create vendor in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }

  @Post('customers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Medusa customer via store API' })
  async createCustomer(@Req() req: any) {
    try {
      return await this.medusaService.createCustomerForUser(req.user);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create customer in Medusa';
      const status =
        err?.response?.status && Number(err.response.status) >= 400 && Number(err.response.status) < 500
          ? err.response.status
          : 502;
      throw new HttpException({ status, message }, status);
    }
  }
}
