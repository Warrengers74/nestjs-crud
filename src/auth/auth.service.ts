import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signupDto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}
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

    // Retourner une réponse de succès
    return { data: 'User created successfully' };
  }
}
