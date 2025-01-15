import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { SignupDto } from './dto/signup.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailerService } from 'src/mailer/mailer.service';
import { SigninDto } from './dto/signin.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ResetPasswordDemandDto } from './dto/resetPasswordDemand.dto';
import { ResetPasswordConfirmationDto } from './dto/resetPasswordConfirmation.dto';
import { DeleteAccountDto } from './dto/deleteAccount.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailerService: MailerService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, username } = signupDto;
    // Vérifier si l'utilisateur existe déjà
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (user) throw new ConflictException('User already exists');

    // Hasher le mot de passe
    const hash = await bcrypt.hash(password, 10);

    // Enregistrer l'utilisateur dans la base de données
    await this.prismaService.user.create({
      data: { email, password: hash, username },
    });

    // Envoyer un email de confimation
    await this.mailerService.sendSignupConfirmation(email);

    // Retourner une réponse de succès
    return { data: 'User created successfully' };
  }

  async signin(signinDto: SigninDto) {
    const { email, password } = signinDto;
    // Véfirier si l'utilisateur existe
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    // Comparer le mot de passe
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    // Retourner un token JWT
    const payload = { sub: user.userId, email: user.email };
    const token = this.jwtService.sign(payload, {
      expiresIn: '1h',
      secret: this.configService.get<string>('SECRET_KEY'),
    });
    return {
      token,
      user: {
        username: user.username,
        email: user.email,
      },
    };
  }

  async resetPasswordDemand(resetPasswordDemandDto: ResetPasswordDemandDto) {
    const { email } = resetPasswordDemandDto;
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    const code = speakeasy.totp({
      secret: this.configService.get<string>('TOTP_SECRET'),
      digits: 5,
      step: 60 * 15,
      encoding: 'base32',
    });
    const url = 'http://localhost:3000/auth/reset-password-confirmation';
    await this.mailerService.sendPasswordReset(email, url, code);
    return { data: 'Password reset email sent' };
  }

  async resetPasswordConfirmation(
    resetPasswordConfirmationDto: ResetPasswordConfirmationDto,
  ) {
    const { email, password, code } = resetPasswordConfirmationDto;
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    const isValid = speakeasy.totp.verify({
      secret: this.configService.get<string>('TOTP_SECRET'),
      token: code,
      digits: 5,
      step: 60 * 15,
      encoding: 'base32',
    });
    if (!isValid) throw new UnauthorizedException('Invalid/Expired code');
    const hash = await bcrypt.hash(password, 10);
    await this.prismaService.user.update({
      where: { email },
      data: { password: hash },
    });
    return { data: 'Password updated successfully' };
  }

  async deleteAccount(userId: number, deleteAccountDto: DeleteAccountDto) {
    const { password } = deleteAccountDto;
    const user = await this.prismaService.user.findUnique({
      where: { userId },
    });
    if (!user) throw new NotFoundException('User not found');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    await this.prismaService.user.delete({ where: { userId } });
    return { data: 'User deleted successfully' };
  }
}
