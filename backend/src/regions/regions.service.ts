import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

const WILAYAH_API_BASE = 'https://wilayah.id/api';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

export type Region = {
  code: string;
  name: string;
};

type WilayahResponse = {
  data?: Array<{
    code?: unknown;
    name?: unknown;
  }>;
};

type CacheEntry = {
  expiresAt: number;
  data: Region[];
};

@Injectable()
export class RegionsService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<Region[]>>();

  async getProvinces(): Promise<Region[]> {
    return this.getCached('provinces', `${WILAYAH_API_BASE}/provinces.json`);
  }

  async getRegencies(provinceCode: string): Promise<Region[]> {
    return this.getCached(
      `regencies:${provinceCode}`,
      `${WILAYAH_API_BASE}/regencies/${provinceCode}.json`,
    );
  }

  private async getCached(key: string, url: string): Promise<Region[]> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending;
    }

    const request = this.fetchRegions(url)
      .then((data) => {
        this.cache.set(key, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          data,
        });
        return data;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, request);
    return request;
  }

  private async fetchRegions(url: string): Promise<Region[]> {
    try {
      const response = await axios.get<WilayahResponse>(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Accept: 'application/json' },
      });

      const rows = response.data?.data;
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('Empty region response');
      }

      return rows.map((row) => {
        const code = typeof row.code === 'string' ? row.code.trim() : '';
        const name = typeof row.name === 'string' ? row.name.trim() : '';
        if (!code || !name) {
          throw new Error('Invalid region row');
        }
        return { code, name };
      });
    } catch {
      throw new ServiceUnavailableException(
        'Data wilayah sedang tidak tersedia. Coba lagi.',
      );
    }
  }
}
