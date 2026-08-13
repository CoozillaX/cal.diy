import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateTeamInputDto {
  @IsString()
  @MinLength(1)
  @ApiProperty({ description: "Team name.", example: "Downtown Sales" })
  name!: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  @ApiPropertyOptional({
    description: "Unique team slug. Must be unique across every team and organization.",
    example: "downtown-sales",
  })
  slug?: string;
}
