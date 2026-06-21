import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

// Minimal Prisma mock — only the methods reservations.create touches.
function makePrisma() {
  return {
    table: { findFirst: jest.fn() },
    reservation: { findFirst: jest.fn(), create: jest.fn() },
  };
}

describe('ReservationsService.create (buffer conflict)', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ReservationsService;

  const dto = {
    tableId: 't1',
    date: '2026-06-21T19:00:00.000Z',
    guestsCount: 4,
  };

  beforeEach(() => {
    prisma = makePrisma();
    service = new ReservationsService(prisma as never);
  });

  it('throws NotFound when the table does not exist', async () => {
    prisma.table.findFirst.mockResolvedValue(null);
    await expect(service.create('cafe1', dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when an overlapping reservation exists in the buffer window', async () => {
    prisma.table.findFirst.mockResolvedValue({ id: 't1', cafeId: 'cafe1' });
    prisma.reservation.findFirst.mockResolvedValue({
      id: 'r-existing',
      date: new Date('2026-06-21T19:30:00.000Z'),
    });

    await expect(service.create('cafe1', dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });

  it('queries the conflict window as 1h before / 2h after the requested time', async () => {
    prisma.table.findFirst.mockResolvedValue({ id: 't1', cafeId: 'cafe1' });
    prisma.reservation.findFirst.mockResolvedValue(null);
    prisma.reservation.create.mockResolvedValue({ id: 'r-new' });

    await service.create('cafe1', dto);

    const where = prisma.reservation.findFirst.mock.calls[0][0].where;
    const reqTime = new Date(dto.date).getTime();
    expect(where.date.gte.getTime()).toBe(reqTime - 60 * 60 * 1000);
    expect(where.date.lte.getTime()).toBe(reqTime + 2 * 60 * 60 * 1000);
    // Only blocks against still-active reservations
    expect(where.status.in).toEqual(expect.arrayContaining(['PENDING', 'CONFIRMED', 'SEATED']));
  });

  it('creates a PENDING reservation when the slot is free', async () => {
    prisma.table.findFirst.mockResolvedValue({ id: 't1', cafeId: 'cafe1' });
    prisma.reservation.findFirst.mockResolvedValue(null);
    prisma.reservation.create.mockResolvedValue({ id: 'r-new', status: 'PENDING' });

    const result = await service.create('cafe1', dto);
    expect(prisma.reservation.create).toHaveBeenCalledTimes(1);
    expect(prisma.reservation.create.mock.calls[0][0].data.status).toBe('PENDING');
    expect(result).toEqual({ id: 'r-new', status: 'PENDING' });
  });
});
