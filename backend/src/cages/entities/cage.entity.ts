import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Animal } from '../../animals/entities/animal.entity';

@Entity('cages')
export class Cage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cage_number', length: 50, unique: true })
  cageNumber: string;

  @Column({ length: 100 })
  room: string;

  @Column({ name: 'cage_type', length: 50 })
  cageType: string;

  @Column({ name: 'max_capacity', type: 'int' })
  maxCapacity: number;

  @Column({
    type: 'enum',
    enum: ['available', 'in_use', 'full', 'maintenance'],
    default: 'available',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Animal, (animal) => animal.cage)
  animals: Animal[];
}
