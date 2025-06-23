import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { GetUserConfigDto, UpdateUserConfigDto } from './dto/user-config.dto';
import { UserConfigService } from './user-config.service';

@Controller('user-config')
@ApiTags('User Config')
export class UserConfigController {
  constructor(private readonly userConfigService: UserConfigService) {}

  @Get(':urn')
  @ApiOperation({ summary: 'Get the user configuration for an app' })
  getUserConfig(@Param('urn') urn: string): Promise<GetUserConfigDto> {
    return this.userConfigService.getUserConfig(castAppUrn(urn));
  }

  @Put(':urn')
  @ApiOperation({ summary: 'Update the user configuration for an app' })
  updateUserConfig(@Param('urn') urn: string, @Body() updateUserConfigDto: UpdateUserConfigDto): Promise<void> {
    return this.userConfigService.updateUserConfig(castAppUrn(urn), updateUserConfigDto);
  }

  @Post(':urn/enable')
  @ApiOperation({ summary: 'Enable the user configuration for an app' })
  enableUserConfig(@Param('urn') urn: string) {
    return this.userConfigService.enableUserConfig(castAppUrn(urn));
  }

  @Post(':urn/disable')
  @ApiOperation({ summary: 'Disable the user configuration for an app' })
  disableUserConfig(@Param('urn') urn: string) {
    return this.userConfigService.disableUserConfig(castAppUrn(urn));
  }
}
