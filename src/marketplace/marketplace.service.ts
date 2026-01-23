import { Injectable } from '@nestjs/common';
import { GraphQLClient } from 'graphql-request';
import { ConfigService } from '@nestjs/config';
import { GetCollectionProductsQuery, GetProductDetailQuery } from './vendure/queries';

@Injectable()
export class MarketplaceService {
  private client: GraphQLClient;

  constructor(private readonly config: ConfigService) {
    const shopApi = this.config.get<string>('VENDURE_SHOP_API');
    const token = this.config.get<string>('VENDURE_CHANNEL_TOKEN');
    if (!shopApi || !token) {
      throw new Error('Missing VENDURE_SHOP_API or VENDURE_CHANNEL_TOKEN in environment');
    }
    this.client = new GraphQLClient(shopApi, {
      headers: { 'vendure-token': token },
    });
  }

  async listProducts(skip = 0, take = 20) {
    const result = await this.client.request(GetCollectionProductsQuery, {
      slug: 'electronics', // TODO: make collection slug dynamic
      input: {
        collectionSlug: 'electronics',
        take,
        skip,
        groupByProduct: true,
      },
    });
    return result.search;
  }

  async getProductDetail(slug: string) {
    const result = await this.client.request(GetProductDetailQuery, { slug });
    return result.product;
  }
}
