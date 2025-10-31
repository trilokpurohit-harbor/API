import {
    Body,
    Controller,
    DefaultValuePipe,
    Delete,
    Get,
    Param,
    ParseBoolPipe,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

type AuthenticatedRequest = Request & { user?: { sub?: string } };

@ApiTags('roles')
@ApiBearerAuth('authorization')
@UseGuards(AuthGuard)
@Controller('roles')
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Post()
    create(@Body() dto: CreateRoleDto, @Req() request: AuthenticatedRequest) {
        return this.roleService.create(dto, this.getActorId(request));
    }

    @ApiQuery({
        name: 'includeInactive',
        required: false,
        type: Boolean,
        description: 'Include soft-deleted roles',
    })
    @Get()
    findAll(
        @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive: boolean,
        @Req() request: AuthenticatedRequest,
    ) {
        console.log('Request made by user:', request.user);
        return this.roleService.findAll(includeInactive);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.roleService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto, @Req() request: AuthenticatedRequest) {
        return this.roleService.update(id, dto, this.getActorId(request));
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
        return this.roleService.remove(id, this.getActorId(request));
    }

    private getActorId(request: AuthenticatedRequest): string | undefined {
        return request.user?.sub;
    }
}
