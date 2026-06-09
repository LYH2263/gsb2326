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
import { AssignAnimalsDto } from './dto/assign-animals.dto';

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
      where: { cageCode: createCageDto.cageCode },
    });
    if (existing) {
      throw new BadRequestException(`笼舍编号 ${createCageDto.cageCode} 已存在`);
    }
    const cage = this.cageRepository.create(createCageDto);
    const saved = await this.cageRepository.save(cage);
    this.logger.log(`Created cage: ${saved.id} - ${saved.cageCode}`);
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
    if (keyword) where.cageCode = Like(`%${keyword}%`);

    const [cages, total] = await this.cageRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const list = await this.enrichWithAnimalCount(cages);
    return { list, total };
  }

  private async enrichWithAnimalCount(cages: Cage[]): Promise<any[]> {
    if (cages.length === 0) return [];
    const cageCodes = cages.map((c) => c.cageCode);
    const counts = await this.animalRepository
      .createQueryBuilder('animal')
      .select('animal.cageNumber', 'cageCode')
      .addSelect('COUNT(*)', 'currentCount')
      .where('animal.cageNumber IN (:...cageCodes)', { cageCodes })
      .andWhere('animal.status != :status', { status: 'deceased' })
      .groupBy('animal.cageNumber')
      .getRawMany();

    const countMap = new Map<string, number>();
    counts.forEach((c) => countMap.set(c.cageCode, parseInt(c.currentCount, 10)));

    return cages.map((cage) => {
      const currentCount = countMap.get(cage.cageCode) || 0;
      const occupancyRate =
        cage.maxCapacity > 0
          ? Math.round((currentCount / cage.maxCapacity) * 100)
          : 0;
      let computedStatus = cage.status;
      if (cage.status !== 'maintenance') {
        if (currentCount === 0) computedStatus = 'idle';
        else if (currentCount >= cage.maxCapacity) computedStatus = 'full';
        else computedStatus = 'in_use';
      }
      return {
        ...cage,
        currentCount,
        occupancyRate,
        computedStatus,
      };
    });
  }

  async findOne(id: number): Promise<any> {
    const cage = await this.cageRepository.findOne({ where: { id } });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${id} 不存在`);
    }
    const [enriched] = await this.enrichWithAnimalCount([cage]);
    return enriched;
  }

  async getAnimals(id: number): Promise<Animal[]> {
    const cage = await this.findOne(id);
    return this.animalRepository.find({
      where: { cageNumber: cage.cageCode },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: number, updateCageDto: UpdateCageDto): Promise<Cage> {
    const cage = await this.cageRepository.findOne({ where: { id } });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${id} 不存在`);
    }
    if (updateCageDto.cageCode && updateCageDto.cageCode !== cage.cageCode) {
      const existing = await this.cageRepository.findOne({
        where: { cageCode: updateCageDto.cageCode },
      });
      if (existing) {
        throw new BadRequestException(`笼舍编号 ${updateCageDto.cageCode} 已存在`);
      }
    }

    if (
      updateCageDto.maxCapacity !== undefined &&
      updateCageDto.maxCapacity !== cage.maxCapacity
    ) {
      const currentCount = await this.animalRepository.count({
        where: { cageNumber: cage.cageCode },
      });
      if (updateCageDto.maxCapacity < currentCount) {
        throw new BadRequestException(
          `最大容量不能小于当前已养数量（${currentCount}只）`,
        );
      }
    }

    Object.assign(cage, updateCageDto);
    const updated = await this.cageRepository.save(cage);
    this.logger.log(`Updated cage: ${updated.id}`);
    return updated;
  }

  async remove(id: number): Promise<void> {
    const cage = await this.cageRepository.findOne({ where: { id } });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${id} 不存在`);
    }
    const animalCount = await this.animalRepository.count({
      where: { cageNumber: cage.cageCode },
    });
    if (animalCount > 0) {
      throw new BadRequestException('该笼舍中还有动物，无法删除，请先移出动物');
    }
    await this.cageRepository.remove(cage);
    this.logger.log(`Removed cage: ${id}`);
  }

  async assignAnimals(id: number, dto: AssignAnimalsDto): Promise<void> {
    const cage = await this.findOne(id);

    if (cage.status === 'maintenance') {
      throw new BadRequestException('该笼舍正在维护中，无法分配动物');
    }

    const currentCount = cage.currentCount;
    const availableSlots = cage.maxCapacity - currentCount;

    if (dto.animalIds.length > availableSlots) {
      throw new BadRequestException(
        `笼舍剩余容量不足：当前已养${currentCount}只，最大容量${cage.maxCapacity}只，仅剩${availableSlots}个位置，无法放入${dto.animalIds.length}只动物`,
      );
    }

    const animals = await this.animalRepository.find({
      where: { id: In(dto.animalIds) },
    });

    if (animals.length !== dto.animalIds.length) {
      const foundIds = animals.map((a) => a.id);
      const missing = dto.animalIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`以下动物ID不存在: ${missing.join(', ')}`);
    }

    const alreadyInCage = animals.filter((a) => a.cageNumber === cage.cageCode);
    if (alreadyInCage.length > 0) {
      throw new BadRequestException(
        `动物 ${alreadyInCage.map((a) => a.name).join(', ')} 已在该笼舍中`,
      );
    }

    await this.animalRepository.update(
      { id: In(dto.animalIds) },
      { cageNumber: cage.cageCode },
    );
    this.logger.log(
      `Assigned animals ${dto.animalIds.join(',')} to cage ${cage.cageCode}`,
    );
  }

  async removeAnimal(id: number, animalId: number): Promise<void> {
    const cage = await this.findOne(id);
    const animal = await this.animalRepository.findOne({
      where: { id: animalId },
    });
    if (!animal) {
      throw new NotFoundException(`动物 #${animalId} 不存在`);
    }
    if (animal.cageNumber !== cage.cageCode) {
      throw new BadRequestException('该动物不在此笼舍中');
    }
    await this.animalRepository.update({ id: animalId }, { cageNumber: null });
    this.logger.log(`Removed animal ${animalId} from cage ${cage.cageCode}`);
  }

  async getAvailableAnimals(
    id: number,
    keyword?: string,
  ): Promise<Animal[]> {
    const cage = await this.findOne(id);
    const query = this.animalRepository
      .createQueryBuilder('animal')
      .where('animal.cageNumber IS NULL OR animal.cageNumber != :cageCode', {
        cageCode: cage.cageCode,
      })
      .andWhere('animal.status != :status', { status: 'deceased' });

    if (keyword) {
      query.andWhere('(animal.name LIKE :kw OR animal.species LIKE :kw)', {
        kw: `%${keyword}%`,
      });
    }

    return query.orderBy('animal.createdAt', 'DESC').limit(50).getMany();
  }

  async getTypeOptions(): Promise<string[]> {
    return ['mouse', 'rat', 'rabbit', 'guinea_pig', 'other'];
  }
}
