import { GraphQLJSONObject } from 'graphql-type-json';
import { Field, ObjectType, registerEnumType } from 'type-graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';
import { getAppInfo, getUpdateInfo } from './apps.helpers';
import { AppInfo, AppStatusEnum } from './apps.types';

registerEnumType(AppStatusEnum, {
  name: 'AppStatusEnum',
});

@ObjectType()
class UpdateInfo {
  @Field(() => Number)
  current!: number;

  @Field(() => Number)
  latest!: number;

  @Field(() => String, { nullable: true })
  dockerVersion?: string;
}

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

  @Field(() => Number, { nullable: true })
  @Column({ type: 'integer', default: 1, nullable: false })
  version!: number;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt!: Date;

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: false, nullable: false })
  exposed!: boolean;

  @Field(() => String)
  @Column({ type: 'varchar', nullable: true })
  domain?: string;

  @Field(() => AppInfo, { nullable: true })
  info(): AppInfo | null {
    return getAppInfo(this.id);
  }

  @Field(() => UpdateInfo, { nullable: true })
  updateInfo(): Promise<UpdateInfo | null> {
    return getUpdateInfo(this.id);
  }
}

export default App;
