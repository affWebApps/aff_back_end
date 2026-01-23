import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';

@ApiTags('Marketplace')
@Controller({ path: 'marketplace', version: '1' })
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) { }

  @Get('products')
  @ApiOperation({ summary: 'List products from Vendure (proxied)' })
  async listProducts(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * take;
    return this.marketplaceService.listProducts(skip, take);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get product detail by slug (Vendure)' })
  async getProductDetail(@Param('slug') slug: string) {
    return this.marketplaceService.getProductDetail(slug);
  }
}
