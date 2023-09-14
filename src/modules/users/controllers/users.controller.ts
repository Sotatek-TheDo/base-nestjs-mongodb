import { CacheKey } from '@nestjs/cache-manager';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FindAllUsersDto } from '../dtos/find-all-users.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { UsersService } from '../services/users.service';
import { AppResponseDto } from '@common/dtos/app.response.dto';
import { QueryOptionsRequestDto } from '@common/dtos/query-options.request.dto';
import { ApiResponse } from '@common/decorators/api-response.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'find all users' })
  @ApiResponse([UserResponseDto])
  @CacheKey('find-all-users')
  @Get()
  async findAllUsers(
    @Query() query: FindAllUsersDto,
    @Query() options: QueryOptionsRequestDto,
  ): Promise<AppResponseDto<UserResponseDto[]>> {
    return this.usersService.findAllUsers(query, options);
  }

  @ApiOperation({ summary: 'find user by email' })
  @ApiResponse(UserResponseDto)
  @CacheKey('find-user-by-email')
  @Get(':email')
  async findUserByEmail(
    @Param('email') email: string,
  ): Promise<AppResponseDto<UserResponseDto>> {
    return this.usersService.findUserByEmail(email);
  }

  @ApiOperation({ summary: 'Check user is exist' })
  @ApiResponse(Boolean)
  @Get('exists/:email')
  async userExists(
    @Param('email') email: string,
  ): Promise<AppResponseDto<boolean>> {
    return this.usersService.userExists(email);
  }
}
