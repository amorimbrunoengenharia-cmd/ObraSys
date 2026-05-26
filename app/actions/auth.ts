"use server";
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';

export async function authenticateUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (user && user.password === password) {
      return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }
    
    return { success: false, error: "Credenciais inválidas!" };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Erro interno no servidor." };
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Retornamos sucesso mesmo sem achar para não vazar emails válidos
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hora de validade

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: expires
      }
    });

    const resetLink = `http://localhost:3000/resetar-senha?token=${token}`;
    console.log(`\n\n[MOCK EMAIL SERVICE] Email de recuperação para: ${email}`);
    console.log(`Link de recuperação: ${resetLink}\n\n`);

    return { success: true, mockLink: resetLink };
  } catch (error) {
    console.error("requestPasswordReset error:", error);
    return { success: false, error: "Erro ao solicitar recuperação." };
  }
}

export async function validateResetToken(token: string) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return { success: false, error: "Token inválido ou expirado." };
    }

    return { success: true, email: user.email };
  } catch (error) {
    return { success: false, error: "Erro ao validar token." };
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return { success: false, error: "Token inválido ou expirado." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newPassword, // idealmente seria em hash com bcrypt
        resetToken: null,
        resetTokenExpires: null
      }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao resetar senha." };
  }
}
