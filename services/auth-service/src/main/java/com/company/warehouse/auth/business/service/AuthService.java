package com.company.warehouse.auth.business.service;

import com.company.warehouse.auth.api.dto.ChangePasswordRequest;
import com.company.warehouse.auth.api.dto.CreateUserRequest;
import com.company.warehouse.auth.api.dto.LoginRequest;
import com.company.warehouse.auth.api.dto.LoginResponse;
import com.company.warehouse.auth.api.dto.RoleDto;
import com.company.warehouse.auth.api.dto.UserDto;

import java.util.List;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    List<UserDto> getAllUsers();

    List<RoleDto> getAllRoles();

    UserDto createUser(CreateUserRequest request);

    LoginResponse changePassword(ChangePasswordRequest request);
}

