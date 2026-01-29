import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { buildSearchInput } from './search-helpers';

@ApiTags('Marketplace')
@Controller({ path: 'marketplace', version: '1' })
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) { }

  @Get('products')
  @ApiOperation({ summary: 'List products from Vendure (proxied)' })
  async listProducts(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('slug') slug: string,
  ) {
    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * take;
    return this.marketplaceService.listCollectionProducts(skip, take, slug);
  }


  @Get('products/id/:id')
  @ApiOperation({ summary: 'Get product detail by id (Vendure)' })
  async getProductDetailById(@Param('id') id: string) {
    return this.marketplaceService.getProductDetailById(id);
  }

  @Get('products/search')
  @ApiOperation({ summary: 'Search products (Vendure)' })
  async searchProducts(
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    const input = buildSearchInput({
      searchParams: query,
      collectionSlug: (query.collection as string) || undefined,
    });
    return this.marketplaceService.searchProductsWithInput(input);
  }

  @Get('products/search2')
  search(
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('facets') facets?: string | string[],
    @Query('sort') sort?: string,
  ) {
    const facetIds = Array.isArray(facets) ? facets : facets ? [facets] : [];
    return this.marketplaceService.search({ q, page: Number(page) || 1, facets: facetIds, sort });
  }

  @Get('products/tokenized-search')
  @ApiOperation({ summary: 'Tokenized search (OR by words) (Vendure)' })
  async tokenizedSearch(
    @Query('term') term = '',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const pageNum = Math.max(1, Number(page) || 1);
    return this.marketplaceService.tokenizedSearch(term, pageNum, take);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create product and default variant (Vendure Admin)' })
  async createProduct(
    @Body('product') productInput: any,
    @Body('variant') variantInput: any,
  ) {
    return this.marketplaceService.createProductWithVariant({ productInput, variantInput });
  }
}
