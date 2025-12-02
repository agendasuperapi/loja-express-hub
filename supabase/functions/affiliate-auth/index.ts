import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + (Deno.env.get("AFFILIATE_SALT") || "affiliate_secret_salt"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json().catch(() => ({}));

    console.log(`[affiliate-auth] Action: ${action}`);

    switch (action) {
      case "register": {
        // Completar registro via convite
        const { invite_token, password, name, phone, cpf_cnpj, pix_key } = body;

        console.log(`[affiliate-auth] ========== REGISTER ACTION ==========`);
        console.log(`[affiliate-auth] invite_token: ${invite_token}`);
        console.log(`[affiliate-auth] invite_token length: ${invite_token?.length}`);

        if (!invite_token || !password) {
          return new Response(
            JSON.stringify({ error: "Token de convite e senha são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (password.length < 6) {
          return new Response(
            JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Primeiro, buscar SEM filtros restritivos para debug
        const { data: debugAffiliate, error: debugError } = await supabase
          .from("store_affiliates")
          .select("id, invite_token, invite_expires, status, affiliate_account_id, is_active")
          .eq("invite_token", invite_token)
          .single();

        console.log(`[affiliate-auth] Debug query result:`, JSON.stringify(debugAffiliate, null, 2));
        console.log(`[affiliate-auth] Debug query error:`, debugError);

        if (!debugAffiliate) {
          console.log(`[affiliate-auth] Token NOT found in store_affiliates table`);
          
          // Listar todos os tokens existentes para debug
          const { data: allTokens } = await supabase
            .from("store_affiliates")
            .select("invite_token, status, invite_expires")
            .not("invite_token", "is", null)
            .limit(10);
          console.log(`[affiliate-auth] Existing tokens in DB:`, JSON.stringify(allTokens, null, 2));
          
          return new Response(
            JSON.stringify({ error: "Convite não encontrado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar expiração manualmente
        if (debugAffiliate.invite_expires) {
          const expiresAt = new Date(debugAffiliate.invite_expires);
          const now = new Date();
          console.log(`[affiliate-auth] Expiration check: expires=${expiresAt.toISOString()}, now=${now.toISOString()}, expired=${expiresAt < now}`);
          
          if (expiresAt < now) {
            return new Response(
              JSON.stringify({ error: "Convite expirado. Solicite um novo convite ao lojista." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Verificar status manualmente - aceitar pending OU invited
        console.log(`[affiliate-auth] Status check: status=${debugAffiliate.status}`);
        if (debugAffiliate.status === "active") {
          return new Response(
            JSON.stringify({ error: "Este convite já foi utilizado. Faça login com suas credenciais." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Agora buscar com join para pegar dados do affiliate_account
        const { data: storeAffiliate, error: inviteError } = await supabase
          .from("store_affiliates")
          .select(`
            *,
            affiliate_accounts!inner(id, email, name, is_verified)
          `)
          .eq("invite_token", invite_token)
          .single();

        console.log(`[affiliate-auth] Full query result:`, JSON.stringify(storeAffiliate, null, 2));
        console.log(`[affiliate-auth] Full query error:`, inviteError);

        if (inviteError || !storeAffiliate) {
          console.error("[affiliate-auth] Error fetching store_affiliate with join:", inviteError);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar dados do convite" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateAccount = storeAffiliate.affiliate_accounts;
        const passwordHash = await hashPassword(password);

        // Atualizar conta do afiliado
        const { error: updateAccountError } = await supabase
          .from("affiliate_accounts")
          .update({
            password_hash: passwordHash,
            name: name || affiliateAccount.name,
            phone: phone || null,
            cpf_cnpj: cpf_cnpj || null,
            pix_key: pix_key || null,
            is_verified: true,
            verification_token: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", affiliateAccount.id);

        if (updateAccountError) {
          console.error("[affiliate-auth] Update account error:", updateAccountError);
          return new Response(
            JSON.stringify({ error: "Erro ao atualizar conta" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Ativar afiliação na loja
        const { error: activateError } = await supabase
          .from("store_affiliates")
          .update({
            status: "active",
            accepted_at: new Date().toISOString(),
            invite_token: null,
            invite_expires: null,
          })
          .eq("id", storeAffiliate.id);

        if (activateError) {
          console.error("[affiliate-auth] Activate error:", activateError);
        }

        // Criar sessão
        const sessionToken = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

        await supabase.from("affiliate_sessions").insert({
          affiliate_account_id: affiliateAccount.id,
          token: sessionToken,
          expires_at: expiresAt.toISOString(),
        });

        console.log(`[affiliate-auth] Registration completed for: ${affiliateAccount.email}`);

        return new Response(
          JSON.stringify({
            success: true,
            token: sessionToken,
            affiliate: {
              id: affiliateAccount.id,
              email: affiliateAccount.email,
              name: name || affiliateAccount.name,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "login": {
        const { email, password } = body;

        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: "Email e senha são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar conta do afiliado
        const { data: account, error: accountError } = await supabase
          .from("affiliate_accounts")
          .select("*")
          .eq("email", email.toLowerCase().trim())
          .single();

        if (accountError || !account) {
          console.log("[affiliate-auth] Account not found:", email);
          return new Response(
            JSON.stringify({ error: "Email ou senha incorretos" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!account.is_active) {
          return new Response(
            JSON.stringify({ error: "Conta desativada" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!account.is_verified) {
          return new Response(
            JSON.stringify({ error: "Conta não verificada. Complete seu cadastro através do link de convite." }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar senha
        const isValidPassword = await verifyPassword(password, account.password_hash);
        if (!isValidPassword) {
          console.log("[affiliate-auth] Invalid password for:", email);
          return new Response(
            JSON.stringify({ error: "Email ou senha incorretos" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Criar nova sessão
        const sessionToken = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

        const { error: sessionError } = await supabase.from("affiliate_sessions").insert({
          affiliate_account_id: account.id,
          token: sessionToken,
          expires_at: expiresAt.toISOString(),
          user_agent: req.headers.get("user-agent") || null,
        });

        if (sessionError) {
          console.error("[affiliate-auth] Session creation error:", sessionError);
          return new Response(
            JSON.stringify({ error: "Erro ao criar sessão" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Atualizar último login
        await supabase
          .from("affiliate_accounts")
          .update({ last_login: new Date().toISOString() })
          .eq("id", account.id);

        console.log(`[affiliate-auth] Login successful for: ${email}`);

        return new Response(
          JSON.stringify({
            success: true,
            token: sessionToken,
            affiliate: {
              id: account.id,
              email: account.email,
              name: account.name,
              phone: account.phone,
              avatar_url: account.avatar_url,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "logout": {
        const { token } = body;

        if (!token) {
          return new Response(
            JSON.stringify({ error: "Token não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase.from("affiliate_sessions").delete().eq("token", token);

        console.log("[affiliate-auth] Logout successful");

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "validate": {
        const { token } = body;

        if (!token) {
          return new Response(
            JSON.stringify({ valid: false }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ valid: false }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateData = validation[0];

        // Buscar dados completos
        const { data: account } = await supabase
          .from("affiliate_accounts")
          .select("*")
          .eq("id", affiliateData.affiliate_id)
          .single();

        return new Response(
          JSON.stringify({
            valid: true,
            affiliate: {
              id: account?.id,
              email: account?.email,
              name: account?.name,
              phone: account?.phone,
              avatar_url: account?.avatar_url,
              pix_key: account?.pix_key,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "forgot-password": {
        const { email } = body;

        if (!email) {
          return new Response(
            JSON.stringify({ error: "Email é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: account } = await supabase
          .from("affiliate_accounts")
          .select("id, email, name")
          .eq("email", email.toLowerCase().trim())
          .single();

        // Sempre retornar sucesso para não revelar se o email existe
        if (account) {
          const resetToken = generateToken();
          const resetExpires = new Date();
          resetExpires.setHours(resetExpires.getHours() + 1); // 1 hora

          await supabase
            .from("affiliate_accounts")
            .update({
              reset_token: resetToken,
              reset_token_expires: resetExpires.toISOString(),
            })
            .eq("id", account.id);

          console.log(`[affiliate-auth] Password reset requested for: ${email}`);
          // TODO: Enviar email com link de reset
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Se o email existir, você receberá um link para redefinir sua senha" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset-password": {
        const { reset_token, token: tokenAlt, new_password, password: passwordAlt } = body;
        const resetToken = reset_token || tokenAlt;
        const newPassword = new_password || passwordAlt;

        if (!resetToken || !newPassword) {
          return new Response(
            JSON.stringify({ error: "Token e nova senha são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (newPassword.length < 6) {
          return new Response(
            JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: account, error: accountError } = await supabase
          .from("affiliate_accounts")
          .select("id")
          .eq("reset_token", resetToken)
          .gt("reset_token_expires", new Date().toISOString())
          .single();

        if (accountError || !account) {
          return new Response(
            JSON.stringify({ error: "Token inválido ou expirado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const passwordHash = await hashPassword(newPassword);

        await supabase
          .from("affiliate_accounts")
          .update({
            password_hash: passwordHash,
            reset_token: null,
            reset_token_expires: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);

        // Invalidar todas as sessões existentes
        await supabase.from("affiliate_sessions").delete().eq("affiliate_account_id", account.id);

        console.log(`[affiliate-auth] Password reset completed for account: ${account.id}`);

        return new Response(
          JSON.stringify({ success: true, message: "Senha redefinida com sucesso" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update-profile": {
        const { token, name, phone, cpf_cnpj, pix_key } = body;

        if (!token) {
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateId = validation[0].affiliate_id;

        const { error: updateError } = await supabase
          .from("affiliate_accounts")
          .update({
            name: name || undefined,
            phone: phone || undefined,
            cpf_cnpj: cpf_cnpj || undefined,
            pix_key: pix_key || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", affiliateId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: "Erro ao atualizar perfil" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: updatedAccount } = await supabase
          .from("affiliate_accounts")
          .select("*")
          .eq("id", affiliateId)
          .single();

        return new Response(
          JSON.stringify({ 
            success: true, 
            affiliate: {
              id: updatedAccount?.id,
              email: updatedAccount?.email,
              name: updatedAccount?.name,
              phone: updatedAccount?.phone,
              pix_key: updatedAccount?.pix_key,
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "change-password": {
        const { token, current_password, new_password } = body;

        if (!token || !current_password || !new_password) {
          return new Response(
            JSON.stringify({ error: "Dados incompletos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: "Nova senha deve ter pelo menos 6 caracteres" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateId = validation[0].affiliate_id;

        // Buscar conta e verificar senha atual
        const { data: account } = await supabase
          .from("affiliate_accounts")
          .select("password_hash")
          .eq("id", affiliateId)
          .single();

        if (!account) {
          return new Response(
            JSON.stringify({ error: "Conta não encontrada" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isValidPassword = await verifyPassword(current_password, account.password_hash);
        if (!isValidPassword) {
          return new Response(
            JSON.stringify({ error: "Senha atual incorreta" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const newPasswordHash = await hashPassword(new_password);

        await supabase
          .from("affiliate_accounts")
          .update({
            password_hash: newPasswordHash,
            updated_at: new Date().toISOString(),
          })
          .eq("id", affiliateId);

        console.log(`[affiliate-auth] Password changed for account: ${affiliateId}`);

        return new Response(
          JSON.stringify({ success: true, message: "Senha alterada com sucesso" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação não reconhecida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[affiliate-auth] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
