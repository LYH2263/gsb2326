import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
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

  async create(createCageDto: CreateCageDto): Promise<Cage> {
    const cage = this.cageRepository.create(createCageDto);
    const saved = await this.cageRepository.save(cage);
    this.logger.log(`Created cage: ${saved.id} - ${saved.code}`);
    return saved;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
  }): Promise<{ list: (Cage & { currentCount: number; occupancyRate: number })[]; total: number }> {
    const { page = 1, pageSize = 10, status, keyword } = query;
    const where: any = {};

    if (status) where.status = status;
    if (keyword) where.code = Like(`%${keyword}%`);

    const [list, total] = await this.cageRepository.findAndCount({
      where,
      relations: ['animals'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const enrichedList = list.map((cage) => {
      const currentCount = cage.animals ? cage.animals.filter((a) => a.status !== 'deceased').length : 0;
      const occupancyRate = cage.maxCapacity > 0 ? (currentCount / cage.maxCapacity) * 100 : 0;
      return {
        ...cage,
        animals: undefined,
        currentCount,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      } as unknown as Cage & { currentCount: number; occupancyRate: number };
    });

    return { list: enrichedList, total };
  }

  async findOne(id: number): Promise<Cage & { currentCount: number; occupancyRate: number }> {
    const cage = await this.cageRepository.findOne({
      where: { id },
      relations: ['animals'],
    });
    if (!cage) {
      throw new NotFoundException(`笼舍 #${id} 不存在`);
    }

    const currentCount = cage.animals ? cage.animals.filter((a) => a.status !== 'deceased').length : 0;
    const occupancyRate = cage.maxCapacity > 0 ? (currentCount / cage.maxCapacity) * 100 : 0;

    return {
      ...cage,
      currentCount,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
    } as Cage & { currentCount: number; occupancyRate: number };
  }

  async update(id: number, updateCageDto: UpdateCageDto): Promise<Cage> {
    const cage = await this.findOne(id);
    Object.assign(cage, updateCageDto);
    const updated = await this.cageRepository.save(cage);
    this.logger.log(`Updated cage: ${updated.id}`);
    return updated;
  }

  async remove(id: number): Promise<void> {
    const cage = await this.findOne(id);
    
    const animalsInCage = await this.animalRepository.count({
      where: { cageId: id },
    });
    
    if (animalsInCage > 0) {
      throw new BadRequestException('该笼舍中还有动物，无法删除');
    }
    
    await this.cageRepository.remove(cage);
    this.logger.log(`Removed cage: ${id}`);
  }

  async getCageAnimals(cageId: number): Promise<Animal[]> {
    const cage = await this.findOne(cageId);
    return cage.animals || [];
  }

  async addAnimalToCage(cageId: number, animalId: number): Promise<Animal> {
    const cage = await this.findOne(cageId);
    
    if (cage.status === 'maintenance') {
      throw new BadRequestException('笼舍处于维护状态，无法添加动物');
    }

    const currentCount = cage.currentCount;
    if (currentCount >= cage.maxCapacity) {
      throw new BadRequestException('笼舍已满，无法添加更多动物');
    }

    const animal = await this.animalRepository.findOne({ where: { id: animalId } });
    if (!animal) {
      throw new NotFoundException(`动物 #${animalId} 不存在`);
    }

    if (animal.cageId === cageId) {
      throw new BadRequestException('该动物已在此笼舍中');
    }

    animal.cageId = cageId;
    animal.cageNumber = cage.code;
    
    const updatedAnimal = await this.animalRepository.save(animal);

    await this.updateCageStatus(cageId);

    this.logger.log(`Added animal ${animalId} to cage ${cageId}`);
    return updatedAnimal;
  }

  async removeAnimalFromCage(cageId: number, animalId: number): Promise<Animal> {
    const animal = await this.animalRepository.findOne({ where: { id: animalId } });
    if (!animal) {
      throw new NotFoundException(`动物 #${animalId} 不存在`);
    }

    if (animal.cageId !== cageId) {
      throw new BadRequestException('该动物不在此笼舍中');
    }

    animal.cageId = null;
    animal.cageNumber = null;
    
    const updatedAnimal = await this.animalRepository.save(animal);

    await this.updateCageStatus(cageId);

    this.logger.log(`Removed animal ${animalId} from cage ${cageId}`);
    return updatedAnimal;
  }

  private async updateCageStatus(cageId: number): Promise<void> {
    const cage = await this.findOne(cageId);
    
    let newStatus = cage.status;
    
    if (cage.status !== 'maintenance') {
      if (cage.currentCount === 0) {
        newStatus = 'idle';
      } else if (cage.currentCount >= cage.maxCapacity) {
        newStatus = 'full';
      } else {
        newStatus = 'in_use';
      }
    }

    if (newStatus !== cage.status) {
      await this.cageRepository.update(cageId, { status: newStatus });
      this.logger.log(`Cage ${cageId} status updated to ${newStatus}`);
    }
  }

  async getAvailableAnimals(keyword?: string): Promise<Animal[]> {
    const where: any = { cageId: null };
    
    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }

    return this.animalRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async count(): Promise<number> {
    return this.cageRepository.count();
  }

  async countByStatus(): Promise<{ status: string; count: number }[]> {
    return this.cageRepository
      .createQueryBuilder('cage')
      .select('cage.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('cage.status')
      .getRawMany();
  }

  async getRoomList(): Promise<string[]> {
    const result = await this.cageRepository
      .createQueryBuilder('cage')
      .select('DISTINCT cage.room', 'room')
      .getRawMany();
    return result.map((r) => r.room);
  }
}
