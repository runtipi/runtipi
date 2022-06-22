import { GraphQLJSONObject } from 'graphql-type-json';
import { Field, ObjectType, registerEnumType } from 'type-graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';
import { getAppInfo } from './apps.helpers';
import { AppInfo, AppStatusEnum } from './apps.types';

registerEnumType(AppStatusEnum, {
  name: 'AppStatusEnum',
});

@ObjectType()
@Entity()
class App extends BaseEntity {
  @Field(() => String)
  @Column({ type: 'varchar', primary: true, unique: true })
  id!: string;

  @Field(() => AppStatusEnum)
  @Column({ type: 'enum', enum: AppStatusEnum, default: AppStatusEnum.STOPPED, nullable: false })
  status!: AppStatusEnum;

  @Field(() => Date)
  @Column({ type: 'timestamptz', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  lastOpened!: Date;

  @Field(() => Number)
  @Column({ type: 'integer', default: 0, nullable: false })
  numOpened!: number;

  @Field(() => GraphQLJSONObject)
  @Column({ type: 'jsonb', nullable: false })
  config!: Record<string, string>;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt!: Date;

  @Field(() => AppInfo)
  info(): AppInfo {
    return getAppInfo(this.id);
  }
}

export default App;
