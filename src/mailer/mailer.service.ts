import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private async transporter() {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      ignoreTLS: true,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return transporter;
  }

  async sendSignupConfirmation(userEmail: string) {
    (await this.transporter()).sendMail({
      from: 'app@localhost.com',
      to: userEmail,
      subject: 'Welcome to our app!',
      html: '<h3>Welcome to our app!</h3>',
    });
  }
}
