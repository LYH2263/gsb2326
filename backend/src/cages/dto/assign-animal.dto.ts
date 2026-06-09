import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAnimalDto {
  @ApiProperty({ description: '动物ID' })
  @IsInt()
  @IsNotEmpty()
  animalId: number;
}
