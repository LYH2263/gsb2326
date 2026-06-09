import { PartialType } from '@nestjs/swagger';
import { CreateCageDto } from './create-cage.dto';

export class UpdateCageDto extends PartialType(CreateCageDto) {}
