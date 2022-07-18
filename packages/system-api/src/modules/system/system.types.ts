import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class Cpu {
  @Field(() => Number, { nullable: false })
  load!: number;
}

@ObjectType()
class DiskMemory {
  @Field(() => Number, { nullable: false })
  total!: number;

  @Field(() => Number, { nullable: false })
  used!: number;

  @Field(() => Number, { nullable: false })
  available!: number;
}

@ObjectType()
class SystemInfoResponse {
  @Field(() => Cpu, { nullable: false })
  cpu!: Cpu;

  @Field(() => DiskMemory, { nullable: false })
  disk!: DiskMemory;

  @Field(() => DiskMemory, { nullable: false })
  memory!: DiskMemory;
}

@ObjectType()
class VersionResponse {
  @Field(() => String, { nullable: false })
  current!: string;

  @Field(() => String, { nullable: true })
  latest?: string;
}

export { SystemInfoResponse, VersionResponse };
