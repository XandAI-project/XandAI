import { AuthUseCase } from '../../application/use-cases/auth.use-case';
import { RegisterUserDto, LoginUserDto, AuthResponseDto, ChangePasswordDto, UpdateProfileDto } from '../../application/dto/auth.dto';
export declare class AuthController {
    private readonly authUseCase;
    constructor(authUseCase: AuthUseCase);
    health(): {
        status: string;
        timestamp: string;
    };
    register(registerDto: RegisterUserDto): Promise<AuthResponseDto>;
    login(loginDto: LoginUserDto): Promise<AuthResponseDto>;
    getProfile(req: any): Promise<any>;
    updateProfile(req: any, updateProfileDto: UpdateProfileDto): Promise<any>;
    changePassword(req: any, changePasswordDto: ChangePasswordDto): Promise<void>;
    verifyToken(req: any): Promise<{
        valid: boolean;
        user: any;
    }>;
}
