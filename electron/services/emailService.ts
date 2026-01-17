import * as nodemailer from 'nodemailer';
import { SettingsService } from './settingsService';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  attachments?: { path: string; filename?: string }[];
  cc?: string;
  bcc?: string;
}

export class EmailService {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  private createTransporter() {
    const settings = this.settingsService.getSettings();

    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
      throw new Error('E-posta ayarları eksik. Lütfen ayarları yapılandırın.');
    }

    return nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const transporter = this.createTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      throw error;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const settings = this.settingsService.getSettings();
      const transporter = this.createTransporter();

      const mailOptions: nodemailer.SendMailOptions = {
        from: settings.emailFrom || settings.smtpUser,
        to: options.to,
        subject: options.subject,
        html: this.formatBodyAsHtml(options.body),
        attachments: options.attachments?.map(att => ({
          path: att.path,
          filename: att.filename
        }))
      };

      if (options.cc) {
        mailOptions.cc = options.cc;
      }

      if (options.bcc) {
        mailOptions.bcc = options.bcc;
      }

      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  private formatBodyAsHtml(text: string): string {
    // Convert plain text to basic HTML
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const lines = escaped.split('\n').map(line => {
      if (line.trim() === '') {
        return '<br>';
      }
      return `<p style="margin: 5px 0;">${line}</p>`;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
          }
        </style>
      </head>
      <body>
        ${lines.join('\n')}
      </body>
      </html>
    `;
  }

  async sendBulkEmails(emailList: EmailOptions[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const email of emailList) {
      try {
        await this.sendEmail(email);
        results.success++;
        
        // Add delay between emails to avoid rate limiting
        await this.delay(1000);
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${email.to}: ${error.message}`);
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Email templates
export const EMAIL_TEMPLATES = {
  default: {
    subject: 'E-Defter Dosyaları - {{companyName}} - {{period}}',
    body: `Sayın {{companyName}},

{{period}} dönemine ait e-defter dosyalarınız ekte gönderilmiştir.

Dosya içeriği:
- Kebir Defteri (XML ve ZIP)
- Yevmiye Defteri (XML ve ZIP)

Saygılarımızla,
E-Defter Yönetim Sistemi`
  },
  reminder: {
    subject: 'E-Defter Hatırlatma - {{companyName}} - {{period}}',
    body: `Sayın {{companyName}},

{{period}} dönemine ait e-defter dosyalarınızın son yükleme tarihi yaklaşmaktadır.

Lütfen dosyaların zamanında yüklenmesini sağlayınız.

Saygılarımızla,
E-Defter Yönetim Sistemi`
  },
  late: {
    subject: 'E-Defter Gecikme Uyarısı - {{companyName}} - {{period}}',
    body: `Sayın {{companyName}},

{{period}} dönemine ait e-defter dosyalarınız henüz yüklenmemiştir.

Son yükleme tarihi geçmiştir. Lütfen en kısa sürede işlem yapınız.

Saygılarımızla,
E-Defter Yönetim Sistemi`
  }
};
