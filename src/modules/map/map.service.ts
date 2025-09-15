import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma/prisma.service';

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) {}

  async getDriverLocations() {
    // Use latest tracking event per driver (updaterId) where coords exist
    const latestByDriver = await this.prisma.trackingEvent.groupBy({
      by: ['updaterId'],
      where: {
        updaterId: { not: null },
        latitude: { not: null },
        longitude: { not: null },
      },
      _max: { timestamp: true },
    });

    const lookups = await this.prisma.trackingEvent.findMany({
      where: {
        OR: latestByDriver
          .filter((g) => g.updaterId)
          .map((g) => ({
            updaterId: g.updaterId!,
            timestamp: g._max.timestamp!,
          })),
      },
      include: {
        updater: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });

    return lookups.map((e) => ({
      driver: e.updater,
      latitude: Number(e.latitude),
      longitude: Number(e.longitude),
      status: e.status,
      timestamp: e.timestamp,
    }));
  }

  async getBranchLocations() {
    const branches = await this.prisma.branch.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        address: {
          select: {
            id: true,
            city: true,
            country: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    return branches
      .filter((b) => b.address?.latitude && b.address?.longitude)
      .map((b) => ({
        id: b.id,
        name: b.name,
        latitude: Number(b.address!.latitude!),
        longitude: Number(b.address!.longitude!),
        city: b.address!.city,
        country: b.address!.country,
      }));
  }
}
