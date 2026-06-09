import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cages')
export class Cage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cage_code', length: 50, unique: true })
  cageCode: string;

  @Column({ name: 'room', length: 100 })
  room: string;

  @Column({
    type: 'enum',
    enum: ['mouse', 'rat', 'rabbit', 'guinea_pig', 'other'],
    default: 'mouse',
  })
  type: string;

  @Column({ name: 'max_capacity', type: 'int' })
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
}
