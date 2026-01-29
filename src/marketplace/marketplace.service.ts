import { Injectable, Logger } from '@nestjs/common';
import { GraphQLClient } from 'graphql-request';
import { ConfigService } from '@nestjs/config';
import { GetCollectionProductsQuery, GetProductDetailQuery, GetProductDetailByIdQuery, SearchProductsQuery } from './vendure/queries';
import { CreateProductMutation, CreateProductVariantsMutation } from './vendure/mutations';
import { SearchInputParams } from './search-helpers';
import { VendureAuthService } from './vendure-auth.service';

@Injectable()
export class MarketplaceService {
  private client: GraphQLClient;
  private adminClient: GraphQLClient;
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly vendureAuthService: VendureAuthService,
  ) {
    const shopApi = this.config.get<string>('VENDURE_SHOP_API');
    const token = this.config.get<string>('VENDURE_CHANNEL_TOKEN');
    const adminApi = this.config.get<string>('VENDURE_ADMIN_API');
    if (!shopApi || !token) {
      throw new Error('Missing VENDURE_SHOP_API or VENDURE_CHANNEL_TOKEN in environment');
    }
    this.client = new GraphQLClient(shopApi, {
      headers: { 'vendure-token': token },
    });
    if (!adminApi) {
      throw new Error('Missing VENDURE_ADMIN_API in environment');
    }
    // adminClient will be created lazily after obtaining a token
    this.adminClient = new GraphQLClient(adminApi);
  }

  async listCollectionProducts(skip = 0, take = 20, slug = 'electronics') {
    const result = await this.client.request(GetCollectionProductsQuery, {
      slug,
      input: {
        collectionSlug: slug,
        take,
        skip,
        groupByProduct: true,
      },
    });
    return result.search;
  }

  async getProductDetailById(id: string) {
    const result = await this.client.request(GetProductDetailByIdQuery, { id });
    return result.product;
  }

  async searchProducts(term: string, skip = 0, take = 20) {
    return this.searchProductsWithInput({
      term,
      take,
      skip,
      groupByProduct: true,
      sort: { name: 'ASC' },
    });
  }

  async searchProductsWithInput(input: SearchInputParams) {
    const result = await this.client.request(SearchProductsQuery, { input });
    return result.search;
  }

  async search(params: { q?: string; page?: number; facets?: string[]; sort?: string }) {
    const take = 12;
    const page = params.page ?? 1;
    const skip = (page - 1) * take;
    const sortMap: Record<string, any> = {
      'name-asc': { name: 'ASC' },
      'name-desc': { name: 'DESC' },
      'price-asc': { price: 'ASC' },
      'price-desc': { price: 'DESC' },
    };

    const input: any = {
      take,
      skip,
      groupByProduct: true,
      sort: sortMap[params.sort ?? 'name-asc'],
    };
    if (params.q) input.term = params.q;
    if (params.facets?.length) {
      input.facetValueFilters = params.facets.map(id => ({ and: id }));
    }

    return this.client.request(SearchProductsQuery, { input });
  }

  /**
   * Tokenized search: split term by whitespace, search each token, merge unique results.
   */
  async tokenizedSearch(term: string, page = 1, take = 20) {
    const normalizedTake = Math.max(1, Math.min(100, take));
    const pageNum = Math.max(1, page);
    const skip = (pageNum - 1) * normalizedTake;

    const tokens = term
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (tokens.length === 0) {
      return this.searchProducts('', skip, normalizedTake);
    }

    const merged: Record<string, any> = {};
    let totalItems = 0;

    for (const token of tokens) {
      const res = await this.searchProducts(token, skip, normalizedTake);
      totalItems = Math.max(totalItems, res.totalItems || 0);
      for (const item of res.items || []) {
        merged[item.productId ?? item.id] = item;
      }
    }

    return {
      totalItems,
      items: Object.values(merged),
    };
  }

  async createProductWithVariant({
    productInput,
    variantInput,
  }: {
    productInput: any;
    variantInput: any;
  }) {
    try {
      // Obtain a fresh admin token
      const adminToken = await this.vendureAuthService.getAdminToken();
      this.logger.log(`Vendure admin token (create product): ${adminToken}`);
      this.adminClient.setHeaders({ Authorization: `Bearer ${adminToken}` });

      const productRes = await this.adminClient.request(CreateProductMutation, { input: productInput });
      const productId = productRes.createProduct.id;
      const variantRes = await this.adminClient.request(CreateProductVariantsMutation, {
        input: [{ ...variantInput, productId }],
      });
      return {
        product: productRes.createProduct,
        variants: variantRes.createProductVariants,
      };
    } catch (error) {
      throw new Error(` ${error}`);
    }
  }
}
