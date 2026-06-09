import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
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

  /**
   * 根据当前数量自动推导状态：
   * - 维护中 (maintenance) 不会被自动覆盖
   * - 当前数 == 0 -> idle
   * - 0 < 当前数 < 容量 -> in_use
   * - 当前数 >= 容量 -> full
   */
  private deriveStatus(current: number, capacity: number, originalStatus?: string): string {
    if (originalStatus === 'maintenance') return 'maintenance';
    if (current <= 0) return 'idle';
    if (current >= capacity) return 'full';
    return 'in_use';
  }

  private async getCurrentCount(cageId: number): Promise<number> {
    return this.animalRepository.count({ where: { cageId } });
  }

  async create(dto: CreateCageDto): Promise<Cage> {
    const exist = await this.cageRepository.findOne({ where: { code: dto.code } });
    if (exist) {
      throw new BadRequestException(`笼舍编号 ${dto.code} 已存在`);
    }
    const cage = this.cageRepository.create(dto);
    if (!cage.status) cage.status = 'idle';
    const saved = await this.cageRepository.save(cage);
    this.logger.log(`Created cage: ${saved.id} - ${saved.code}`);
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
    if (keyword) where.code = Like(`%${keyword}%`);

    const [list, total] = await this.cageRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 附加当前数量与占用率
    const result = await Promise.all(
      list.map(async (cage) => {
        const currentCount = await this.getCurrentCount(cage.id);
        const occupancyRate =
          cage.capacity > 0 ? Math.round((currentCount / cage.capacity) * 100) : 0;
        return { ...cage, currentCount, occupancyRate };
      }),
    );

    return { list: result, total };
  }

  async findOne(id: number): Promise<any> {
    const cage = await this.cageRepository.findOne({
      where: { id },
      relations: ['animals'],
    });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${id} 不存在`);
    }
    const currentCount = cage.animals?.length || 0;
    const occupancyRate =
      cage.capacity > 0 ? Math.round((currentCount / cage.capacity) * 100) : 0;
    return { ...cage, currentCount, occupancyRate };
  }

  async update(id: number, dto: UpdateCageDto): Promise<Cage> {
    const cage = await this.cageRepository.findOne({ where: { id } });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${id} 不存在`);
    }

    if (dto.code && dto.code !== cage.code) {
      const exist = await this.cageRepository.findOne({ where: { code: dto.code } });
      if (exist) {
        throw new BadRequestException(`笼舍编号 ${dto.code} 已存在`);
      }
    }

    // 容量调整时不能小于当前已养数量
    if (dto.capacity !== undefined && dto.capacity < cage.capacity) {
      const currentCount = await this.getCurrentCount(id);
      if (dto.capacity < currentCount) {
        throw new BadRequestException(
          `调整容量(${dto.capacity})不能小于当前已养数量(${currentCount})`,
        );
      }
    }

    Object.assign(cage, dto);

    // 若用户没主动改 status, 自动根据数量推导
    if (dto.status === undefined) {
      const currentCount = await this.getCurrentCount(id);
      cage.status = this.deriveStatus(currentCount, cage.capacity, cage.status);
    }

    const updated = await this.cageRepository.save(cage);
    this.logger.log(`Updated cage: ${updated.id}`);
    return updated;
  }

  async remove(id: number): Promise<void> {
    const cage = await this.cageRepository.findOne({ where: { id } });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${id} 不存在`);
    }
    const currentCount = await this.getCurrentCount(id);
    if (currentCount > 0) {
      throw new BadRequestException(
        `笼舍内仍有 ${currentCount} 只动物，无法删除，请先移出动物`,
      );
    }
    await this.cageRepository.remove(cage);
    this.logger.log(`Removed cage: ${id}`);
  }

  /**
   * 将动物分配到笼舍内
   */
  async assignAnimal(cageId: number, animalId: number): Promise<any> {
    const cage = await this.cageRepository.findOne({ where: { id: cageId } });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${cageId} 不存在`);
    }
    if (cage.status === 'maintenance') {
      throw new BadRequestException(`笼舍处于维护中，无法分配动物`);
    }

    const animal = await this.animalRepository.findOne({ where: { id: animalId } });
    if (!animal) {
      throw new NotFoundException(`动物 #${animalId} 不存在`);
    }
    if (animal.cageId === cageId) {
      throw new BadRequestException(`该动物已在此笼舍中`);
    }

    const currentCount = await this.getCurrentCount(cageId);
    if (currentCount >= cage.capacity) {
      throw new BadRequestException(
        `笼舍已满（${currentCount}/${cage.capacity}），无法继续分配`,
      );
    }

    animal.cageId = cageId;
    animal.cageNumber = cage.code;
    await this.animalRepository.save(animal);

    // 重新计算状态
    const newCount = currentCount + 1;
    cage.status = this.deriveStatus(newCount, cage.capacity, cage.status);
    await this.cageRepository.save(cage);

    this.logger.log(`Assigned animal ${animalId} to cage ${cageId}`);
    return this.findOne(cageId);
  }

  /**
   * 将动物移出笼舍
   */
  async removeAnimal(cageId: number, animalId: number): Promise<any> {
    const cage = await this.cageRepository.findOne({ where: { id: cageId } });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${cageId} 不存在`);
    }

    const animal = await this.animalRepository.findOne({ where: { id: animalId } });
    if (!animal) {
      throw new NotFoundException(`动物 #${animalId} 不存在`);
    }
    if (animal.cageId !== cageId) {
      throw new BadRequestException(`该动物不在此笼舍中`);
    }

    animal.cageId = null;
    animal.cageNumber = null;
    await this.animalRepository.save(animal);

    const newCount = await this.getCurrentCount(cageId);
    cage.status = this.deriveStatus(newCount, cage.capacity, cage.status);
    await this.cageRepository.save(cage);

    this.logger.log(`Removed animal ${animalId} from cage ${cageId}`);
    return this.findOne(cageId);
  }

  async count(): Promise<number> {
    return this.cageRepository.count();
  }
}
