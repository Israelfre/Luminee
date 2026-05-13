import "express-session";

declare module "express-session" {
  interface SessionData {
    /** Painel /admin (tabela `admin_users`). */
    adminUserId?: number;
    adminEmail?: string;
    /** Dono do salão (tabela `salons`, login e-mail + senha). */
    salonId?: number;
  }
}
