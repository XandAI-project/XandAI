import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

/**
 * DTO para registro de usuÃ¡rio
 */
export class RegisterUserDto {
  @IsEmail({}, { message: 'Email deve ter um formato vÃ¡lido' })
  email: string;

  @IsString({ message: 'Primeiro nome Ã© obrigatÃ³rio' })
  @MinLength(2, { message: 'Primeiro nome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'Primeiro nome deve ter no mÃ¡ximo 50 caracteres' })
  firstName: string;

  @IsString({ message: 'Sobrenome Ã© obrigatÃ³rio' })
  @MinLength(2, { message: 'Sobrenome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'Sobrenome deve ter no mÃ¡ximo 50 caracteres' })
  lastName: string;

  @IsString({ message: 'Senha Ã© obrigatÃ³ria' })
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  @MaxLength(100, { message: 'Senha deve ter no mÃ¡ximo 100 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;

  @IsOptional()
  @IsIn(['light', 'dark'], { message: 'Tema deve ser light ou dark' })
  theme?: 'light' | 'dark';
}

/**
 * DTO para login de usuÃ¡rio
 */
export class LoginUserDto {
  @IsEmail({}, { message: 'Email deve ter um formato vÃ¡lido' })
  email: string;

  @IsString({ message: 'Senha Ã© obrigatÃ³ria' })
  password: string;
}

/**
 * DTO para atualizaÃ§Ã£o de perfil
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;

  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: 'light' | 'dark';

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  llmConfig?: {
    temperature?: number;
    maxTokens?: number;
    topK?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    repeatPenalty?: number;
    seed?: number;
  };
}

/**
 * DTO para alteraÃ§Ã£o de senha
 */
export class ChangePasswordDto {
  @IsString({ message: 'Senha atual Ã© obrigatÃ³ria' })
  currentPassword: string;

  @IsString({ message: 'Nova senha Ã© obrigatÃ³ria' })
  @MinLength(8, { message: 'Nova senha deve ter pelo menos 8 caracteres' })
  @MaxLength(100, { message: 'Nova senha deve ter no mÃ¡ximo 100 caracteres' })
  newPassword: string;
}

/**
 * DTO de resposta para autenticaÃ§Ã£o
 */
export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    theme: string;
    preferredLanguage?: string;
    avatar?: string;
    systemPrompt?: string;
    llmConfig?: {
      temperature?: number;
      maxTokens?: number;
      topK?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      repeatPenalty?: number;
      seed?: number;
    };
    createdAt: Date;
  };
  
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}