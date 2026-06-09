import { IsString, IsOptional, IsEnum, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCageDto {
  @ApiProperty({ description: '笼舍编号', example: 'A-101' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: '所在房间', example: '动物房A区' })
  @IsString()
  @MaxLength(100)
  room: string;

  @ApiProperty({ description: '笼舍类型', example: '小鼠笼' })
  @IsString()
  @MaxLength(50)
  type: string;

  @ApiProperty({ description: '最大容量', example: 5 })
  @IsInt()
  @Min(1)
  maxCapacity: number;

  @ApiProperty({ description: '状态', enum: ['idle', 'in_use', 'full', 'maintenance'] })
  @IsEnum(['idle', 'in_use', 'full', 'maintenance'])
  status: string;

  @ApiPropertyOptional({ description: '备注描述' })
  @IsOptional()
  @IsString()
  description?: string;
}
