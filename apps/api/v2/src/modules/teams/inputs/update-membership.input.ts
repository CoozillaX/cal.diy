import { MembershipRole } from "@calcom/platform-libraries";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export class UpdateMembershipInputDto {
  @IsEnum(MembershipRole)
  @ApiProperty({ enum: MembershipRole, description: "New role to grant the user within the team." })
  role!: MembershipRole;
}
