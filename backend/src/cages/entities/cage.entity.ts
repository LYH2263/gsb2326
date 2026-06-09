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

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  room: string;

  @Column({ length: 50 })
  type: string;

  @Column({ name: 'capacity', type: 'int' })
  maxCapacity: number;

  @Column({
    type: 'enum',
    enum: ['idle', 'in_use', 'full', 'maintenance'],
    default: 'idle',
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
