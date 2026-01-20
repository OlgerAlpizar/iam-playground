import { winstonLogger } from '@authentication/backend-utils';
import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

import { appConfig } from '../../config/app.config';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
}

let transporter: Transporter | null = null;

const createTransporter = (): Transporter | null => {
  if (!appConfig.email.smtp) {
    return null;
  }

  const { host, port, secure, user, pass } = appConfig.email.smtp;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user && pass ? { auth: { user, pass } } : {}),
  });
};

const getTransporter = (): Transporter | null => {
  if (transporter === null && appConfig.email.smtp) {
    transporter = createTransporter();
  }
  return transporter;
};

const logEmailToConsole = (options: EmailOptions): void => {
  winstonLogger.info('Email sent (console mode)', {
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
};

const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transport = getTransporter();

  if (!transport) {
    logEmailToConsole(options);
    return;
  }

  await transport.sendMail({
    from: appConfig.email.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
};

const sendPasswordChangedNotification = async (email: string): Promise<void> => {
  const text = `Password Changed

    Your password was recently changed. If you made this change, you can safely ignore this email.

    If you did NOT change your password, your account may be compromised. Please:
    1. Reset your password immediately
    2. Review your account activity
    3. Contact support if you need assistance

    This is an automated security notification.`;

  await sendEmail({
    to: email,
    subject: 'Your password was changed',
    text,
  });
};

const sendAccountDeactivatedNotification = async (
  email: string,
  deletionDeadline: Date,
): Promise<void> => {
  const formattedDate = deletionDeadline.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const text = `Account Deactivated

    Your account has been deactivated as requested.

    Your account and all associated data will be permanently deleted on ${formattedDate}.

    If you change your mind, you can reactivate your account before this date by logging in with your credentials.

    If you did NOT request this deactivation, please reactivate your account immediately and change your password.

    This is an automated security notification.`;

  await sendEmail({
    to: email,
    subject: 'Your account has been deactivated',
    text,
  });
};

export const emailService = {
  sendEmail,
  sendPasswordChangedNotification,
  sendAccountDeactivatedNotification,
};
