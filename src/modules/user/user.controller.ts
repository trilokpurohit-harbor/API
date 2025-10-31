import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UserService } from './user.service';
import { UserType } from '@prisma/client';
import { UserTypeGuard } from '@app/common/guards/userType.guard';

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

    @Patch('role')
    @ApiBody({ type: AssignRoleDto })
    @ApiOperation({ description: 'Assign role to user (Admin only)' })
    @UseGuards(UserTypeGuard(UserType.Admin))
    assignRole(@Body() assignRoleDto: AssignRoleDto) {
        return this.userService.assignRole(assignRoleDto.userId, assignRoleDto.roleId);
    }

    @Patch(':id')
    update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.userService.update(id, updateUserDto);
    }

    @Delete(':id')
    remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.userService.remove(id);
    }
}
