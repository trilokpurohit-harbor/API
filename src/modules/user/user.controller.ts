import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UserService } from './user.service';
import { RolesGuard } from '@common/guards/roles.guard';
import { RoleName } from '@common/enums/role-name.enum';

@Controller('users')
@UseGuards(AuthGuard)
@ApiBearerAuth('authorization')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    @Get()
    findAll() {
        return this.userService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.userService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.userService.update(id, updateUserDto);
    }

    @Patch('role')
    @ApiOperation({ description: 'Assign role to user (Admin only)' })
    @UseGuards(RolesGuard(RoleName.Admin))
    assignRole(@Body() assignRoleDto: AssignRoleDto) {
        return this.userService.assignRole(assignRoleDto.userId, assignRoleDto.role);
    }

    @Delete(':id')
    remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.userService.remove(id);
    }
}
