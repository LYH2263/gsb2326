import { IsString, IsInt, IsEnum, IsOptional, Min, Length, Max } from 'class-validator';

export class CreateCageDto {
  @IsString()
  @Length(1, 50)
  cageCode: string;

  @IsString()
  @Length(1, 100)
  room: string;

  @IsEnum(['mouse', 'rat', 'rabbit', 'guinea_pig', 'other'])
  type: string;

  @IsInt()
  @Min(1)
  @Max(100)
  maxCapacity: number;

  @IsEnum(['idle', 'in_use', 'full', 'maintenance'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
