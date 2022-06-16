import { AppStatusEnum } from '@runtipi/common';
import { Field, ObjectType } from 'type-graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';

@ObjectType()
@Entity()
class App extends BaseEntity {
  @Field(() => String)
  @Column({ primary: true, unique: true })
  id!: string;

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: false })
  installed!: boolean;

  @Field(() => AppStatusEnum)
  @Column({ type: 'enum', enum: AppStatusEnum, default: AppStatusEnum.STOPPED, nullable: false })
  status!: AppStatusEnum;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt!: Date;
}

export default App;
