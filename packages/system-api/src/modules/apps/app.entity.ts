import { AppStatusEnum } from '@runtipi/common';
import { Field, ObjectType } from 'type-graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';

@ObjectType()
@Entity()
class App extends BaseEntity {
  @Field(() => String)
  @Column({ type: 'varchar', primary: true, unique: true })
  id!: string;

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: false })
  installed!: boolean;

  @Field(() => String)
  @Column({ type: 'enum', enum: AppStatusEnum, default: AppStatusEnum.STOPPED, nullable: false })
  status!: AppStatusEnum;

  @Field(() => Date)
  @Column({ type: 'date', nullable: true })
  lastOpened!: Date;

  @Field(() => Number)
  @Column({ type: 'integer', default: 0, nullable: false })
  numOpened!: number;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt!: Date;
}

export default App;
