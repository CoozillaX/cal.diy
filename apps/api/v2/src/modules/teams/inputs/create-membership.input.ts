import { MembershipRole } from "@calcom/platform-libraries";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsOptional } from "class-validator";

export class CreateMembershipInputDto {
  @IsInt()
  @ApiProperty({ description: "Id of the cal.diy user to add to the team.", example: 42 })
  userId!: number;

  @IsEnum(MembershipRole)
  @IsOptional()
  @ApiPropertyOptional({
    enum: MembershipRole,
    default: MembershipRole.MEMBER,
    description: "Role to grant the user within the team.",
  })
  role?: MembershipRole;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    default: true,
    description:
      "Whether the membership is immediately accepted. Callers using a store-management API key are " +
      "adding real employees on their behalf, so this defaults to true rather than requiring the user " +
      "to separately accept an invite.",
  })
  accepted?: boolean;
}
