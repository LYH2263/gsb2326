import { IsInt, ArrayMinSize, IsArray } from 'class-validator';

export class AssignAnimalsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  animalIds: number[];
}
