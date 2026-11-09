import { ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { RegionsService } from './regions.service';

jest.mock('axios');

const mockedAxios = axios as unknown as { get: jest.Mock };

describe('RegionsService', () => {
  let service: RegionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RegionsService();
  });

  it('maps and caches provinces', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        data: [
          { code: '11', name: 'Aceh' },
          { code: '32', name: 'Jawa Barat' },
        ],
      },
    });

    await expect(service.getProvinces()).resolves.toEqual([
      { code: '11', name: 'Aceh' },
      { code: '32', name: 'Jawa Barat' },
    ]);
    await expect(service.getProvinces()).resolves.toHaveLength(2);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('requests regencies for the selected province', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { data: [{ code: '32.73', name: 'Kota Bandung' }] },
    });

    await expect(service.getRegencies('32')).resolves.toEqual([
      { code: '32.73', name: 'Kota Bandung' },
    ]);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://wilayah.id/api/regencies/32.json',
      expect.objectContaining({ timeout: 10_000 }),
    );
  });

  it('shares an in-flight request for the same region list', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { data: [{ code: '11', name: 'Aceh' }] },
    });

    await Promise.all([service.getProvinces(), service.getProvinces()]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed upstream rows', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { data: [{ code: '11', name: '' }] },
    });

    await expect(service.getProvinces()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects an empty upstream response', async () => {
    mockedAxios.get.mockResolvedValue({ data: { data: [] } });

    await expect(service.getProvinces()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns a service unavailable error when the upstream request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network down'));

    await expect(service.getProvinces()).rejects.toMatchObject({
      message: 'Data wilayah sedang tidak tersedia. Coba lagi.',
    });
  });
});
