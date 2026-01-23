import { Injectable } from '@nestjs/common';
import { GraphQLClient } from 'graphql-request';
import { ConfigService } from '@nestjs/config';
import { SearchProductsQuery } from './vendure/queries';

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

  async listProducts(skip = 0, take = 20, term = '') {
    return this.client.request(SearchProductsQuery, {
      input: {
        term,
        take,
        skip,
      },
    });
  }
}
