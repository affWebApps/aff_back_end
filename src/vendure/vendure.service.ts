import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface VendureAuth {
  shopToken: string;
  adminToken: string;
}

@Injectable()
export class VendureService {
  private readonly logger = new Logger(VendureService.name);
  private readonly vendureUrl: string;
  private readonly vendureAdminToken: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.vendureUrl = this.config.get<string>('VENDURE_URL') ?? '';
    this.vendureAdminToken = this.config.get<string>('VENDURE_ADMIN_TOKEN') ?? '';
  }

  /**
   * Ensure the current user has a Vendure customer (and vendor) record and persist the IDs locally.
   * If records already exist, returns the stored IDs.
   * NOTE: This is a skeleton. Wire the GraphQL calls to Vendure Admin API here.
   */
  async ensureVendureIdentities(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        customer_id: true,
        vendor_id: true,
      },
    });
    if (!user) {
      throw new Error('User not found');
    }

    let { customer_id: customerId, vendor_id: vendorId } = user;

    // If both exist, nothing to do
    if (customerId && vendorId) {
      return { customerId, vendorId };
    }

    // TODO: Replace the stubs below with real Vendure Admin API calls.
    if (!customerId) {
      customerId = await this.stubCreateCustomer(user.email);
    }
    if (!vendorId) {
      vendorId = await this.stubCreateVendor(user.email);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        customer_id: customerId,
        vendor_id: vendorId,
      },
    });

    return { customerId, vendorId };
  }

  // ---- Stubs to be replaced with Vendure Admin API calls ----
  private async stubCreateCustomer(email: string) {
    this.logger.warn(`stubCreateCustomer called for ${email}; replace with Vendure Admin API`);
    return `cust_${Date.now()}`;
  }

  private async stubCreateVendor(email: string) {
    this.logger.warn(`stubCreateVendor called for ${email}; replace with Vendure Admin API`);
    return `vendor_${Date.now()}`;
  }

  // Example helper for POSTing to Vendure (GraphQL or REST)
  private async vendurePost<T = any>(path: string, body: any, token?: string): Promise<T> {
    const url = `${this.vendureUrl}${path}`;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const res = await firstValueFrom(
      this.http.post<T>(url, body, {
        headers,
      }),
    );
    return res.data;
  }
}
