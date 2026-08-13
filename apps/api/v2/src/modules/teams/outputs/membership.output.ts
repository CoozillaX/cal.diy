import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { MembershipRole } from "@calcom/platform-libraries";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, ValidateNested } from "class-validator";

export class MembershipOutputDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsInt()
  @Expose()
  readonly userId!: number;

  @IsInt()
  @Expose()
  readonly teamId!: number;

  @IsEnum(MembershipRole)
  @Expose()
  @ApiProperty({ enum: MembershipRole })
  readonly role!: MembershipRole;

  @IsBoolean()
  @Expose()
  readonly accepted!: boolean;
}

export class MembershipOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  @Expose()
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => MembershipOutputDto)
  data!: MembershipOutputDto;
}

export class MembershipsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  @Expose()
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => MembershipOutputDto)
  @IsArray()
  data!: MembershipOutputDto[];
}
