import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    console.log(`[affiliate-invite] Action: ${action}`);

    switch (action) {
      case "send": {
        // Loja envia convite para afiliado
        const { 
          store_id, 
          email, 
          name,
          coupon_id 
        } = body;

        console.log(`[affiliate-invite] Send action: email=${email}, store_id=${store_id}`);

        // Validar autorização
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar se é dono da loja
        const { data: store } = await supabase
          .from("stores")
          .select("id, name, owner_id")
          .eq("id", store_id)
          .single();

        if (!store || store.owner_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Sem permissão para esta loja" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!email || !name) {
          return new Response(
            JSON.stringify({ error: "Email e nome são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Verificar se já existe conta de afiliado com este email
        let affiliateAccount;
        const { data: existingAccount } = await supabase
          .from("affiliate_accounts")
          .select("*")
          .eq("email", normalizedEmail)
          .single();

        if (existingAccount) {
          affiliateAccount = existingAccount;

          // Verificar se já é afiliado desta loja
          const { data: existingAffiliation } = await supabase
            .from("store_affiliates")
            .select("*")
            .eq("affiliate_account_id", existingAccount.id)
            .eq("store_id", store_id)
            .single();

          if (existingAffiliation) {
            if (existingAffiliation.status === "active") {
              return new Response(
                JSON.stringify({ error: "Este afiliado já está vinculado à sua loja" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            // Reativar afiliação pendente/inativa
            const inviteToken = generateToken();
            const inviteExpires = new Date();
            inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 dias

            await supabase
              .from("store_affiliates")
              .update({
                status: existingAccount.is_verified ? "active" : "pending",
                is_active: true,
                invite_token: existingAccount.is_verified ? null : inviteToken,
                invite_expires: existingAccount.is_verified ? null : inviteExpires.toISOString(),
                default_commission_type: "percentage",
                default_commission_value: 0,
                coupon_id: coupon_id || null,
              })
              .eq("id", existingAffiliation.id);

            console.log(`[affiliate-invite] Reactivated affiliation for: ${normalizedEmail}`);

            return new Response(
              JSON.stringify({ 
                success: true, 
                message: existingAccount.is_verified 
                  ? "Afiliado vinculado com sucesso"
                  : "Convite reenviado com sucesso",
                invite_token: existingAccount.is_verified ? null : inviteToken,
                already_verified: existingAccount.is_verified,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          // Criar nova conta de afiliado (sem senha ainda)
          const { data: newAccount, error: createError } = await supabase
            .from("affiliate_accounts")
            .insert({
              email: normalizedEmail,
              name: name,
              password_hash: "", // Será definido no registro
              is_verified: false,
            })
            .select()
            .single();

          if (createError) {
            console.error("[affiliate-invite] Create account error:", createError);
            return new Response(
              JSON.stringify({ error: "Erro ao criar conta de afiliado" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          affiliateAccount = newAccount;
        }

        // Criar afiliação à loja
        const inviteToken = generateToken();
        const inviteExpires = new Date();
        inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 dias

        console.log(`[affiliate-invite] Creating store_affiliate: is_verified=${affiliateAccount.is_verified}, token=${inviteToken}, expires=${inviteExpires.toISOString()}`);

        const { data: storeAffiliate, error: affiliateError } = await supabase
          .from("store_affiliates")
          .insert({
            affiliate_account_id: affiliateAccount.id,
            store_id: store_id,
            coupon_id: coupon_id || null,
            default_commission_type: "percentage",
            default_commission_value: 0,
            invite_token: affiliateAccount.is_verified ? null : inviteToken,
            invite_expires: affiliateAccount.is_verified ? null : inviteExpires.toISOString(),
            status: affiliateAccount.is_verified ? "active" : "pending",
            accepted_at: affiliateAccount.is_verified ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (affiliateError) {
          console.error("[affiliate-invite] Create affiliation error:", affiliateError);
          return new Response(
            JSON.stringify({ error: "Erro ao criar afiliação" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[affiliate-invite] Store affiliate created: id=${storeAffiliate.id}, invite_token=${storeAffiliate.invite_token}, invite_expires=${storeAffiliate.invite_expires}`);

        // TODO: Enviar email com link de convite

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: affiliateAccount.is_verified 
              ? "Afiliado vinculado com sucesso"
              : "Convite enviado com sucesso",
            invite_token: affiliateAccount.is_verified ? null : inviteToken,
            store_affiliate_id: storeAffiliate.id,
            already_verified: affiliateAccount.is_verified,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-invite-link": {
        // Buscar ou regenerar link de convite para afiliado existente
        const { store_id, affiliate_email } = body;

        // Validar autorização
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar se é dono da loja
        const { data: store } = await supabase
          .from("stores")
          .select("id, owner_id")
          .eq("id", store_id)
          .single();

        if (!store || store.owner_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Sem permissão para esta loja" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const normalizedEmail = affiliate_email.toLowerCase().trim();

        // Buscar conta do afiliado
        const { data: affiliateAccount } = await supabase
          .from("affiliate_accounts")
          .select("id, is_verified")
          .eq("email", normalizedEmail)
          .single();

        if (!affiliateAccount) {
          return new Response(
            JSON.stringify({ error: "Afiliado não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar afiliação com a loja
        const { data: storeAffiliate } = await supabase
          .from("store_affiliates")
          .select("*")
          .eq("affiliate_account_id", affiliateAccount.id)
          .eq("store_id", store_id)
          .single();

        if (!storeAffiliate) {
          return new Response(
            JSON.stringify({ error: "Afiliação não encontrada" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Se afiliado já verificou a conta, não precisa de link de convite
        if (affiliateAccount.is_verified) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              already_verified: true,
              message: "Este afiliado já está cadastrado e verificado"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Se já tem token válido, retornar
        if (storeAffiliate.invite_token && storeAffiliate.invite_expires) {
          const expiresAt = new Date(storeAffiliate.invite_expires);
          if (expiresAt > new Date()) {
            return new Response(
              JSON.stringify({ 
                success: true, 
                invite_token: storeAffiliate.invite_token,
                expires_at: storeAffiliate.invite_expires
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Gerar novo token
        const inviteToken = generateToken();
        const inviteExpires = new Date();
        inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 dias

        await supabase
          .from("store_affiliates")
          .update({
            invite_token: inviteToken,
            invite_expires: inviteExpires.toISOString(),
            status: "pending",
          })
          .eq("id", storeAffiliate.id);

        console.log(`[affiliate-invite] Generated new invite token for: ${normalizedEmail}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            invite_token: inviteToken,
            expires_at: inviteExpires.toISOString()
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "verify": {
        // Verificar se token de convite é válido
        const { token } = body;

        console.log(`[affiliate-invite] Verifying token: ${token}`);

        if (!token) {
          return new Response(
            JSON.stringify({ valid: false, error: "Token não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: storeAffiliate, error } = await supabase
          .from("store_affiliates")
          .select(`
            *,
            affiliate_accounts!inner(id, email, name, is_verified),
            stores!inner(id, name, logo_url)
          `)
          .eq("invite_token", token)
          .single();

        console.log(`[affiliate-invite] Store affiliate found:`, storeAffiliate ? 'yes' : 'no', 'error:', error?.message);

        if (error || !storeAffiliate) {
          console.log(`[affiliate-invite] Token not found: ${token}`);
          return new Response(
            JSON.stringify({ valid: false, error: "Convite não encontrado" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[affiliate-invite] Affiliate data:`, {
          is_verified: storeAffiliate.affiliate_accounts.is_verified,
          status: storeAffiliate.status,
          invite_expires: storeAffiliate.invite_expires,
          now: new Date().toISOString()
        });

        // Verificar se já está verificado
        if (storeAffiliate.affiliate_accounts.is_verified) {
          console.log(`[affiliate-invite] Already verified`);
          return new Response(
            JSON.stringify({ valid: false, error: "Este convite já foi utilizado. Faça login na sua conta de afiliado." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar se expirou
        if (storeAffiliate.invite_expires) {
          const expiresAt = new Date(storeAffiliate.invite_expires);
          const now = new Date();
          console.log(`[affiliate-invite] Expiration check: expires=${expiresAt.toISOString()}, now=${now.toISOString()}, expired=${expiresAt < now}`);
          if (expiresAt < now) {
            console.log(`[affiliate-invite] Token expired: ${token}, expires: ${storeAffiliate.invite_expires}`);
            return new Response(
              JSON.stringify({ valid: false, error: "Convite expirado. Solicite um novo link ao lojista." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Verificar status
        if (storeAffiliate.status === "active") {
          console.log(`[affiliate-invite] Status is active`);
          return new Response(
            JSON.stringify({ valid: false, error: "Este convite já foi aceito. Faça login na sua conta." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            valid: true,
            affiliate: {
              email: storeAffiliate.affiliate_accounts.email,
              name: storeAffiliate.affiliate_accounts.name,
            },
            store: {
              id: storeAffiliate.stores.id,
              name: storeAffiliate.stores.name,
              logo_url: storeAffiliate.stores.logo_url,
            },
            commission_type: storeAffiliate.default_commission_type,
            commission_value: storeAffiliate.default_commission_value,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "accept": {
        // Afiliado já cadastrado aceita convite para nova loja
        const { affiliate_token, invite_token } = body;

        if (!affiliate_token || !invite_token) {
          return new Response(
            JSON.stringify({ error: "Tokens não fornecidos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão do afiliado
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: affiliate_token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateAccountId = validation[0].affiliate_id;

        // Buscar convite
        const { data: storeAffiliate, error: inviteError } = await supabase
          .from("store_affiliates")
          .select(`
            *,
            affiliate_accounts!inner(id, email),
            stores!inner(id, name)
          `)
          .eq("invite_token", invite_token)
          .gt("invite_expires", new Date().toISOString())
          .eq("status", "pending")
          .single();

        if (inviteError || !storeAffiliate) {
          return new Response(
            JSON.stringify({ error: "Convite inválido ou expirado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar se o convite é para este afiliado
        if (storeAffiliate.affiliate_account_id !== affiliateAccountId) {
          return new Response(
            JSON.stringify({ error: "Este convite não é para sua conta" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Aceitar convite
        await supabase
          .from("store_affiliates")
          .update({
            status: "active",
            accepted_at: new Date().toISOString(),
            invite_token: null,
            invite_expires: null,
          })
          .eq("id", storeAffiliate.id);

        console.log(`[affiliate-invite] Invite accepted for store: ${storeAffiliate.stores.name}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Você agora é afiliado da loja ${storeAffiliate.stores.name}!`,
            store: {
              id: storeAffiliate.stores.id,
              name: storeAffiliate.stores.name,
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-stores": {
        // Listar lojas do afiliado
        const { token } = body;

        if (!token) {
          return new Response(
            JSON.stringify({ error: "Token não fornecido" }),
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

        const affiliateAccountId = validation[0].affiliate_id;

        // Buscar lojas usando a função do banco
        const { data: stores, error } = await supabase.rpc("get_affiliate_stores", {
          p_affiliate_account_id: affiliateAccountId,
        });

        if (error) {
          console.error("[affiliate-invite] List stores error:", error);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar lojas" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ stores: stores || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "stats": {
        // Estatísticas consolidadas do afiliado
        const { token } = body;

        if (!token) {
          return new Response(
            JSON.stringify({ error: "Token não fornecido" }),
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

        const affiliateAccountId = validation[0].affiliate_id;

        const { data: stats, error } = await supabase.rpc("get_affiliate_consolidated_stats", {
          p_affiliate_account_id: affiliateAccountId,
        });

        if (error) {
          console.error("[affiliate-invite] Stats error:", error);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar estatísticas" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ stats: stats?.[0] || {} }),
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
    console.error("[affiliate-invite] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
