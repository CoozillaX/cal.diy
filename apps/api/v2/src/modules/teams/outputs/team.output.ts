import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

export class TeamOutputDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsString()
  @Expose()
  readonly name!: string;

  @IsString()
  @IsOptional()
  @Expose()
  readonly slug?: string | null;
}

export class TeamOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  @Expose()
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => TeamOutputDto)
  data!: TeamOutputDto;
}

export class TeamsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  @Expose()
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TeamOutputDto)
  @IsArray()
  data!: TeamOutputDto[];
}
