import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CagesService } from './cages.service';
import { CagesController } from './cages.controller';
import { Cage } from './entities/cage.entity';
import { Animal } from '../animals/entities/animal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cage, Animal])],
  controllers: [CagesController],
  providers: [CagesService],
  exports: [CagesService],
})
export class CagesModule {}
