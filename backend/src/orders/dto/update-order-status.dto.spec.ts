import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { updateOrderStatusDto } from './update-order-status.dto';

describe('updateOrderStatusDto', () => {
  it('accepts COMPLETED', async () => {
    const dto = plainToInstance(updateOrderStatusDto, {
      status: 'COMPLETED',
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it.each([
    'PENDING',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'CANCELLED',
    'REFUNDED',
  ])('rejects %s', async (status) => {
    const dto = plainToInstance(updateOrderStatusDto, { status });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('status');
  });
});
