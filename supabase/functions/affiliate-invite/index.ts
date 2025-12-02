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

    console.log(`[affiliate-invite] Action: ${action}, body:`, JSON.stringify(body));

    switch (action) {
      case "send": {
        // Loja envia convite para afiliado
        const { 
          store_id, 
          email, 
          name,
          coupon_id 
        } = body;

        console.log(`[affiliate-invite] Send action: email=${email}, store_id=${store_id}, name=${name}`);

        // Validar autorização
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          console.log(`[affiliate-invite] No auth header`);
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          console.log(`[affiliate-invite] Auth error:`, authError);
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[affiliate-invite] Authenticated user: ${user.id}`);

        // Verificar se é dono da loja
        const { data: store, error: storeError } = await supabase
          .from("stores")
          .select("id, name, owner_id")
          .eq("id", store_id)
          .single();

        console.log(`[affiliate-invite] Store lookup:`, store ? `found: ${store.name}` : 'not found', storeError?.message);

        if (!store || store.owner_id !== user.id) {
          console.log(`[affiliate-invite] Store permission denied. Store owner: ${store?.owner_id}, user: ${user.id}`);
          return new Response(
            JSON.stringify({ error: "Sem permissão para esta loja" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!email || !name) {
          console.log(`[affiliate-invite] Missing email or name`);
          return new Response(
            JSON.stringify({ error: "Email e nome são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const normalizedEmail = email.toLowerCase().trim();
        console.log(`[affiliate-invite] Normalized email: ${normalizedEmail}`);

        // Verificar se já existe conta de afiliado com este email
        let affiliateAccount;
        const { data: existingAccount, error: accountError } = await supabase
          .from("affiliate_accounts")
          .select("*")
          .eq("email", normalizedEmail)
          .single();

        console.log(`[affiliate-invite] Existing account check:`, existingAccount ? `found: id=${existingAccount.id}, is_verified=${existingAccount.is_verified}` : 'not found', accountError?.message);

        if (existingAccount) {
          affiliateAccount = existingAccount;

          // Verificar se já é afiliado desta loja
          const { data: existingAffiliation, error: affiliationError } = await supabase
            .from("store_affiliates")
            .select("*")
            .eq("affiliate_account_id", existingAccount.id)
            .eq("store_id", store_id)
            .single();

          console.log(`[affiliate-invite] Existing affiliation check:`, existingAffiliation ? `found: id=${existingAffiliation.id}, status=${existingAffiliation.status}` : 'not found', affiliationError?.message);

          if (existingAffiliation) {
            if (existingAffiliation.status === "active") {
              console.log(`[affiliate-invite] Affiliation already active`);
              return new Response(
                JSON.stringify({ error: "Este afiliado já está vinculado à sua loja" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            // Reativar afiliação pendente/inativa
            const inviteToken = generateToken();
            const inviteExpires = new Date();
            inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 dias

            console.log(`[affiliate-invite] Reactivating affiliation: is_verified=${existingAccount.is_verified}, new_token=${inviteToken}, expires=${inviteExpires.toISOString()}`);

            // IMPORTANTE: Sempre salvar o token, independente de is_verified
            // O is_verified só importa na hora de verificar o convite
            const { data: updatedAffiliation, error: updateError } = await supabase
              .from("store_affiliates")
              .update({
                status: "pending",
                is_active: true,
                invite_token: inviteToken,
                invite_expires: inviteExpires.toISOString(),
                default_commission_type: "percentage",
                default_commission_value: 0,
                coupon_id: coupon_id || null,
              })
              .eq("id", existingAffiliation.id)
              .select()
              .single();

            if (updateError) {
              console.error(`[affiliate-invite] Update affiliation error:`, updateError);
              return new Response(
                JSON.stringify({ error: "Erro ao atualizar afiliação" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            console.log(`[affiliate-invite] Affiliation updated successfully:`, {
              id: updatedAffiliation.id,
              invite_token: updatedAffiliation.invite_token,
              invite_expires: updatedAffiliation.invite_expires,
              status: updatedAffiliation.status
            });

            // Verificar se o token foi realmente salvo
            const { data: verifyUpdate } = await supabase
              .from("store_affiliates")
              .select("invite_token, invite_expires")
              .eq("id", existingAffiliation.id)
              .single();

            console.log(`[affiliate-invite] Verification after update:`, verifyUpdate);

            return new Response(
              JSON.stringify({ 
                success: true, 
                message: "Convite reenviado com sucesso",
                invite_token: inviteToken,
                already_verified: existingAccount.is_verified,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          // Criar nova conta de afiliado (sem senha ainda)
          console.log(`[affiliate-invite] Creating new affiliate account for: ${normalizedEmail}`);
          
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

          console.log(`[affiliate-invite] New account created: id=${newAccount.id}, is_verified=${newAccount.is_verified}`);
          affiliateAccount = newAccount;
        }

        // Criar afiliação à loja
        const inviteToken = generateToken();
        const inviteExpires = new Date();
        inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 dias

        console.log(`[affiliate-invite] Creating store_affiliate: account_id=${affiliateAccount.id}, is_verified=${affiliateAccount.is_verified}, token=${inviteToken}, expires=${inviteExpires.toISOString()}`);

        const { data: storeAffiliate, error: affiliateError } = await supabase
          .from("store_affiliates")
          .insert({
            affiliate_account_id: affiliateAccount.id,
            store_id: store_id,
            coupon_id: coupon_id || null,
            default_commission_type: "percentage",
            default_commission_value: 0,
            invite_token: inviteToken,
            invite_expires: inviteExpires.toISOString(),
            status: "pending",
            accepted_at: null,
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

        console.log(`[affiliate-invite] Store affiliate created successfully:`, {
          id: storeAffiliate.id,
          invite_token: storeAffiliate.invite_token,
          invite_expires: storeAffiliate.invite_expires,
          status: storeAffiliate.status
        });

        // Verificar se o token foi realmente salvo no banco
        const { data: verifyInsert } = await supabase
          .from("store_affiliates")
          .select("invite_token, invite_expires, status")
          .eq("id", storeAffiliate.id)
          .single();

        console.log(`[affiliate-invite] Verification after insert:`, verifyInsert);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Convite enviado com sucesso",
            invite_token: inviteToken,
            store_affiliate_id: storeAffiliate.id,
            already_verified: false,
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

        console.log(`[affiliate-invite] ========== VERIFY ACTION ==========`);
        console.log(`[affiliate-invite] Token received: "${token}"`);
        console.log(`[affiliate-invite] Token length: ${token?.length}`);

        if (!token) {
          console.log(`[affiliate-invite] ERROR: Token is empty or undefined`);
          return new Response(
            JSON.stringify({ valid: false, error: "Token não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Primeiro, buscar TODOS os store_affiliates para debug
        const { data: allAffiliates, error: allError } = await supabase
          .from("store_affiliates")
          .select("id, invite_token, invite_expires, status")
          .not("invite_token", "is", null)
          .limit(10);

        console.log(`[affiliate-invite] All affiliates with tokens:`, JSON.stringify(allAffiliates, null, 2));

        // Buscar especificamente pelo token
        const { data: storeAffiliate, error } = await supabase
          .from("store_affiliates")
          .select(`
            *,
            affiliate_accounts!inner(id, email, name, is_verified),
            stores!inner(id, name, logo_url)
          `)
          .eq("invite_token", token)
          .single();

        console.log(`[affiliate-invite] Query result:`, {
          found: !!storeAffiliate,
          error: error?.message,
          errorCode: error?.code
        });

        if (error || !storeAffiliate) {
          console.log(`[affiliate-invite] Token NOT found in database: "${token}"`);
          
          // Tentar buscar sem o join para ver se o problema é no join
          const { data: simpleSearch, error: simpleError } = await supabase
            .from("store_affiliates")
            .select("*")
            .eq("invite_token", token)
            .single();
          
          console.log(`[affiliate-invite] Simple search result:`, {
            found: !!simpleSearch,
            data: simpleSearch,
            error: simpleError?.message
          });

          return new Response(
            JSON.stringify({ valid: false, error: "Convite não encontrado" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[affiliate-invite] Token FOUND! Affiliate data:`, {
          store_affiliate_id: storeAffiliate.id,
          affiliate_account_id: storeAffiliate.affiliate_account_id,
          is_verified: storeAffiliate.affiliate_accounts.is_verified,
          status: storeAffiliate.status,
          invite_expires: storeAffiliate.invite_expires,
          now: new Date().toISOString()
        });

        // Verificar se já está verificado
        if (storeAffiliate.affiliate_accounts.is_verified) {
          console.log(`[affiliate-invite] Affiliate already verified - should login instead`);
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
            console.log(`[affiliate-invite] Token EXPIRED`);
            return new Response(
              JSON.stringify({ valid: false, error: "Convite expirado. Solicite um novo link ao lojista." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Verificar status
        if (storeAffiliate.status === "active") {
          console.log(`[affiliate-invite] Status is already active`);
          return new Response(
            JSON.stringify({ valid: false, error: "Este convite já foi aceito. Faça login na sua conta." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[affiliate-invite] Token VALID! Returning success`);

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

        return new Response(
          JSON.stringify({ 
            success: true,
            store: {
              id: storeAffiliate.stores.id,
              name: storeAffiliate.stores.name,
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-stores": {
        // Lista lojas vinculadas ao afiliado
        const { affiliate_token } = body;

        if (!affiliate_token) {
          return new Response(
            JSON.stringify({ error: "Token não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão
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

        // Buscar lojas usando a função do banco
        const { data: stores, error: storesError } = await supabase.rpc("get_affiliate_stores", {
          p_affiliate_account_id: affiliateAccountId,
        });

        if (storesError) {
          console.error("[affiliate-invite] Error fetching stores:", storesError);
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
        const { affiliate_token } = body;

        if (!affiliate_token) {
          return new Response(
            JSON.stringify({ error: "Token não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão
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

        // Buscar estatísticas usando a função do banco
        const { data: stats, error: statsError } = await supabase.rpc("get_affiliate_consolidated_stats", {
          p_affiliate_account_id: affiliateAccountId,
        });

        if (statsError) {
          console.error("[affiliate-invite] Error fetching stats:", statsError);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar estatísticas" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ stats: stats?.[0] || null }),
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
