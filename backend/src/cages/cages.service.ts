import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Cage } from './entities/cage.entity';
import { Animal } from '../animals/entities/animal.entity';
import { CreateCageDto } from './dto/create-cage.dto';
import { UpdateCageDto } from './dto/update-cage.dto';

@Injectable()
export class CagesService {
  private readonly logger = new Logger(CagesService.name);

  constructor(
    @InjectRepository(Cage)
    private readonly cageRepository: Repository<Cage>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
  ) {}

  async create(createCageDto: CreateCageDto): Promise<Cage> {
    const existing = await this.cageRepository.findOne({
      where: { cageNumber: createCageDto.cageNumber },
    });
    if (existing) {
      throw new BadRequestException(
        `笼舍编号 ${createCageDto.cageNumber} 已存在`,
      );
    }
    const cage = this.cageRepository.create(createCageDto);
    const saved = await this.cageRepository.save(cage);
    this.logger.log(`Created cage: ${saved.id} - ${saved.cageNumber}`);
    return saved;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
  }): Promise<{ list: any[]; total: number }> {
    const { page = 1, pageSize = 10, status, keyword } = query;
    const where: any = {};

    if (status) where.status = status;
    if (keyword) where.cageNumber = Like(`%${keyword}%`);

    const [cages, total] = await this.cageRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const cageIds = cages.map((c) => c.id);
    const animalCounts =
      cageIds.length > 0
        ? await this.animalRepository
            .createQueryBuilder('animal')
            .select('animal.cage_id', 'cageId')
            .addSelect('COUNT(*)', 'count')
            .where('animal.cage_id IN (:...cageIds)', { cageIds })
            .groupBy('animal.cage_id')
            .getRawMany()
        : [];

    const countMap = new Map<number, number>();
    animalCounts.forEach((r) => countMap.set(Number(r.cageId), Number(r.count)));

    const list = cages.map((cage) => {
      const currentCount = countMap.get(cage.id) || 0;
      const occupancyRate =
        cage.maxCapacity > 0
          ? Math.round((currentCount / cage.maxCapacity) * 100)
          : 0;
      return {
        ...cage,
        currentCount,
        occupancyRate,
      };
    });

    return { list, total };
  }

  async findOne(id: number): Promise<any> {
    const cage = await this.cageRepository.findOne({
      where: { id },
      relations: ['animals'],
    });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${id} 不存在`);
    }
    const currentCount = cage.animals ? cage.animals.length : 0;
    const occupancyRate =
      cage.maxCapacity > 0
        ? Math.round((currentCount / cage.maxCapacity) * 100)
        : 0;
    return {
      ...cage,
      currentCount,
      occupancyRate,
    };
  }

  async update(id: number, updateCageDto: UpdateCageDto): Promise<Cage> {
    const cage = await this.cageRepository.findOne({ where: { id } });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${id} 不存在`);
    }

    if (updateCageDto.cageNumber && updateCageDto.cageNumber !== cage.cageNumber) {
      const existing = await this.cageRepository.findOne({
        where: { cageNumber: updateCageDto.cageNumber },
      });
      if (existing) {
        throw new BadRequestException(
          `笼舍编号 ${updateCageDto.cageNumber} 已存在`,
        );
      }
    }

    if (updateCageDto.maxCapacity) {
      const currentCount = await this.animalRepository.count({
        where: { cage: { id } },
      });
      if (updateCageDto.maxCapacity < currentCount) {
        throw new BadRequestException(
          `最大容量不能小于当前已养数量 (${currentCount})`,
        );
      }
    }

    Object.assign(cage, updateCageDto);
    const updated = await this.cageRepository.save(cage);
    this.logger.log(`Updated cage: ${updated.id}`);
    return updated;
  }

  async remove(id: number): Promise<void> {
    const cage = await this.cageRepository.findOne({
      where: { id },
      relations: ['animals'],
    });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${id} 不存在`);
    }
    if (cage.animals && cage.animals.length > 0) {
      throw new BadRequestException(
        `笼舍中还有 ${cage.animals.length} 只动物，无法删除`,
      );
    }
    await this.cageRepository.remove(cage);
    this.logger.log(`Removed cage: ${id}`);
  }

  async assignAnimal(cageId: number, animalId: number): Promise<void> {
    const cage = await this.cageRepository.findOne({
      where: { id: cageId },
    });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${cageId} 不存在`);
    }
    if (cage.status === 'maintenance') {
      throw new BadRequestException('笼舍正在维护中，无法分配动物');
    }

    const animal = await this.animalRepository.findOne({
      where: { id: animalId },
    });
    if (!animal) {
      throw new NotFoundException(`动物 #${animalId} 不存在`);
    }

    const currentCount = await this.animalRepository.count({
      where: { cage: { id: cageId } },
    });
    if (currentCount >= cage.maxCapacity) {
      throw new BadRequestException(
        `笼舍已满 (最大容量: ${cage.maxCapacity})，无法继续分配动物`,
      );
    }

    animal.cage = cage;
    animal.cageNumber = cage.cageNumber;
    await this.animalRepository.save(animal);

    await this.updateCageStatus(cageId);
    this.logger.log(`Assigned animal ${animalId} to cage ${cageId}`);
  }

  async removeAnimal(cageId: number, animalId: number): Promise<void> {
    const cage = await this.cageRepository.findOne({
      where: { id: cageId },
    });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${cageId} 不存在`);
    }

    const animal = await this.animalRepository.findOne({
      where: { id: animalId },
      relations: ['cage'],
    });
    if (!animal) {
      throw new NotFoundException(`动物 #${animalId} 不存在`);
    }
    if (!animal.cage || animal.cage.id !== cageId) {
      throw new BadRequestException(`动物 #${animalId} 不在笼舍 #${cageId} 中`);
    }

    animal.cage = null as any;
    animal.cageNumber = null as any;
    await this.animalRepository.save(animal);

    await this.updateCageStatus(cageId);
    this.logger.log(`Removed animal ${animalId} from cage ${cageId}`);
  }

  private async updateCageStatus(cageId: number): Promise<void> {
    const cage = await this.cageRepository.findOne({ where: { id: cageId } });
    if (!cage || cage.status === 'maintenance') return;

    const currentCount = await this.animalRepository.count({
      where: { cage: { id: cageId } },
    });

    if (currentCount === 0) {
      cage.status = 'available';
    } else if (currentCount >= cage.maxCapacity) {
      cage.status = 'full';
    } else {
      cage.status = 'in_use';
    }
    await this.cageRepository.save(cage);
  }

  async getAvailableAnimals(): Promise<Animal[]> {
    return this.animalRepository.find({
      where: { cage: null as any },
      select: ['id', 'name', 'species', 'status'],
      order: { name: 'ASC' },
    });
  }
}
