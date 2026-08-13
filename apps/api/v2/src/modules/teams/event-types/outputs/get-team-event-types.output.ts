import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { TeamEventTypeOutput_2024_06_14 } from "@calcom/platform-types";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsIn, ValidateNested } from "class-validator";

export class GetTeamEventTypesOutput_2024_06_14 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsIn([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested({ each: true })
  @Type(() => TeamEventTypeOutput_2024_06_14)
  @IsArray()
  data!: TeamEventTypeOutput_2024_06_14[];
}
