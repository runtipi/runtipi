import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UpdateStatusEnum {
  FAILED = 'FAILED',
  SUCCESS = 'SUCCESS',
}

@Entity()
export default class Update extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, nullable: false })
  name!: string;

  @Column({ type: 'enum', enum: UpdateStatusEnum, nullable: false })
  status!: UpdateStatusEnum;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
